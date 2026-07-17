package session

// Package session contains runtime state and statistical calculations for split files.
//
// statistics.go contains incremental and full rebuild helpers for Gold, Personal Best,
// Rolling Average, and Sum of Best values.

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/zellydev-games/opensplit/logger"
)

func (s *SplitFile) AddRun(run *Run, rollingWindow int) {
	if run == nil {
		return
	}

	s.Runs = append(s.Runs, *run)

	if rollingWindow > 0 {
		s.RollingAverageRuns = rollingWindow
	}

	s.RebuildStatistics()
}

// RebuildStatistics recomputes all derived statistics from the run history.
//
// This performs a full rebuild of Golds, Rolling Averages, PB data, and Sum of Best.
// It should be called after bulk modifications to run history.
func (s *SplitFile) RebuildStatistics() {
	if s == nil {
		return
	}

	logger.Debugf(logModule,
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
		if gold, ok := golds[leaf.ID]; ok {
			leaf.Gold = gold
			sob += gold
		} else if leaf.Gold <= 0 {
			leaf.Gold = 0
		}

		if avg, ok := averages[leaf.ID]; ok {
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

	for _, leaf := range leafSegments {
		if split, ok := pb.Splits[leaf.ID]; ok {
			leaf.PB = split.CurrentDuration
		}
	}

	logger.Debugf(logModule,
		"statistics rebuilt SOB=%d PB=%v",
		s.SOB.Milliseconds(),
		s.PB != nil,
	)
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
