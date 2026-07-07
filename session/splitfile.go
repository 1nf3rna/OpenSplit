package session

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/zellydev-games/opensplit/logger"
)

// SplitFile contains a game's split definitions together with run history.
type SplitFile struct {
	ID           uuid.UUID
	GameName     string
	GameID       string
	GameCategory string
	CategoryID   string
	Version      int

	SelectedSkin string

	Segments []Segment
	Runs     []Run
	PB       *Run

	SOB                time.Duration
	Attempts           int
	Offset             time.Duration
	Platform           string
	RollingAverageRuns int

	WR WorldRecord

	WindowX      int
	WindowY      int
	WindowHeight int
	WindowWidth  int
}

// WorldRecord stores optional world record information displayed in the UI.
type WorldRecord struct {
	Show       bool
	RunID      string
	Players    []string
	RealTime   float64
	InGameTime float64
}

func (s *SplitFile) DeepCopyLeafSegments() []Segment {
	leafPointers := getLeafSegments(s.Segments, nil)
	out := make([]Segment, 0, len(leafPointers))
	for i := range leafPointers {
		out = append(out, *leafPointers[i])
	}
	return deepCopySegments(out)
}

func (s *SplitFile) BuildStats() {
	if s == nil {
		return
	}
	logger.Debugf(
		logModule,
		"rebuilding statistics (%d runs)",
		len(s.Runs),
	)

	leafSegments := getLeafSegments(s.Segments, nil)
	if len(leafSegments) == 0 {
		s.SOB = 0
		s.PB = nil
		return
	}

	golds := s.computeGolds()
	averages := s.computeRollingAverages()

	var sob time.Duration

	for _, leaf := range leafSegments {
		id := leaf.ID

		if gold, ok := golds[id]; ok {
			leaf.Gold = gold
			sob += gold
		} else if leaf.Gold <= 0 {
			leaf.Gold = 0
		}

		if avg, ok := averages[id]; ok {
			leaf.Average = avg
		} else if leaf.Average <= 0 {
			leaf.Average = 0
		}
	}

	pb, _, err := getPB(s.Runs)
	if err != nil {
		s.PB = nil
		s.SOB = sob
		return
	}

	s.PB = pb
	s.SOB = sob

	logger.Debugf(
		logModule,
		"statistics rebuilt SOB=%d PB=%v",
		s.SOB.Milliseconds(),
		s.PB != nil,
	)
	for _, leaf := range leafSegments {
		if leaf.PB > 0 {
			continue
		}

		if split, ok := pb.Splits[leaf.ID]; ok {
			leaf.PB = split.CurrentDuration
		}
	}
}

func (s *SplitFile) computeGolds() map[uuid.UUID]time.Duration {
	golds := make(map[uuid.UUID]time.Duration)

	for _, run := range s.Runs {
		if !run.Completed {
			continue
		}

		for id, split := range run.Splits {
			if cur, ok := golds[id]; !ok || split.CurrentDuration < cur {
				golds[id] = split.CurrentDuration
			}
		}
	}

	return golds
}

func (s *SplitFile) rollingRuns() []Run {
	var completed []Run

	for _, run := range s.Runs {
		if !run.Completed {
			continue
		}

		if run.SplitFileVersion != s.Version {
			continue
		}

		completed = append(completed, run)
	}

	if len(completed) == 0 {
		return nil
	}

	window := s.RollingAverageRuns
	if window <= 0 {
		window = 10
	}

	if s.Version == 0 && len(completed) < window {
		return completed
	}

	if len(completed) <= window {
		return completed
	}

	return completed[len(completed)-window:]
}

func (s *SplitFile) computeRollingAverages() map[uuid.UUID]time.Duration {
	runs := s.rollingRuns()

	sums := make(map[uuid.UUID]time.Duration)
	counts := make(map[uuid.UUID]int)

	for _, run := range runs {
		for id, split := range run.Splits {
			sums[id] += split.CurrentDuration
			counts[id]++
		}
	}

	averages := make(map[uuid.UUID]time.Duration)

	for id, sum := range sums {
		if counts[id] == 0 {
			continue
		}

		averages[id] = sum / time.Duration(counts[id])
	}

	return averages
}

func (s *SplitFile) UpdatePBSegments(pb *Run) {
	if pb == nil {
		return
	}

	leafSegments := getLeafSegments(s.Segments, nil)

	for _, leaf := range leafSegments {
		split, ok := pb.Splits[leaf.ID]
		if !ok {
			continue
		}

		if leaf.PB <= 0 || split.CurrentDuration < leaf.PB {
			leaf.PB = split.CurrentDuration
		}
	}

	s.PB = pb
	logger.Debug(
		logModule,
		"personal best updated",
	)
}

func DeepCopySplitFile(inFile *SplitFile) SplitFile {
	segments := deepCopySegments(inFile.Segments)
	runs := deepCopyRuns(inFile.Runs)

	var pbRun *Run
	if inFile.PB != nil {
		pbCopy := deepCopyRun(*inFile.PB)
		pbRun = &pbCopy
	}

	return SplitFile{
		ID:           inFile.ID,
		GameName:     inFile.GameName,
		GameID:       inFile.GameID,
		GameCategory: inFile.GameCategory,
		CategoryID:   inFile.CategoryID,
		Version:      inFile.Version,

		SelectedSkin: inFile.SelectedSkin,

		Segments: segments,
		Runs:     runs,
		PB:       pbRun,

		SOB:                inFile.SOB,
		Attempts:           inFile.Attempts,
		Offset:             inFile.Offset,
		Platform:           inFile.Platform,
		RollingAverageRuns: inFile.RollingAverageRuns,

		WR: inFile.WR,

		WindowX:      inFile.WindowX,
		WindowY:      inFile.WindowY,
		WindowWidth:  inFile.WindowWidth,
		WindowHeight: inFile.WindowHeight,
	}
}

func getPB(runs []Run) (*Run, time.Duration, error) {
	if len(runs) == 0 {
		return nil, 0, errors.New("no runs found")
	}

	var fastestRun *Run = nil
	fastestTotal := time.Duration(0)
	for i, run := range runs {
		if !run.Completed {
			continue
		}
		if fastestRun == nil || run.TotalTime < fastestTotal {
			fastestRun = &runs[i]
			fastestTotal = run.TotalTime
		}
	}

	if fastestRun == nil {
		return nil, time.Duration(0), errors.New("no completed runs found")
	}

	return fastestRun, fastestTotal, nil
}

func getLeafSegments(segments []Segment, out []*Segment) []*Segment {
	for i := range segments {
		if len(segments[i].Children) == 0 {
			out = append(out, &segments[i])
		} else {
			out = getLeafSegments(segments[i].Children, out)
		}
	}
	return out
}

func deepCopyRuns(inRuns []Run) []Run {
	runs := make([]Run, len(inRuns))
	for i := range inRuns {
		runs[i] = deepCopyRun(inRuns[i])
	}
	return runs
}

func deepCopyRun(run Run) Run {
	segments := deepCopySegments(run.LeafSegments)
	splits := deepCopySplits(run.Splits)

	return Run{
		ID:               run.ID,
		SplitFileVersion: run.SplitFileVersion,
		TotalTime:        run.TotalTime,
		Splits:           splits,
		Completed:        run.Completed,
		LeafSegments:     segments,
	}
}

func deepCopySplits(inSplits map[uuid.UUID]Split) map[uuid.UUID]Split {
	splits := map[uuid.UUID]Split{}
	for segmentID, split := range inSplits {
		splits[segmentID] = Split{
			SplitSegmentID:    split.SplitSegmentID,
			CurrentCumulative: split.CurrentCumulative,
			CurrentDuration:   split.CurrentDuration,
		}
	}
	return splits
}

func deepCopySegments(list []Segment) []Segment {
	out := make([]Segment, len(list))
	for i, s := range list {
		out[i] = Segment{
			ID:       s.ID,
			Name:     s.Name,
			Gold:     s.Gold,
			Average:  s.Average,
			PB:       s.PB,
			Icon:     s.Icon,
			Children: deepCopySegments(s.Children),
		}
	}
	return out
}
