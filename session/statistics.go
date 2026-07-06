package session

import (
	"time"

	"github.com/google/uuid"
)

func (s *SplitFile) UpdateGolds(run *Run) {
	if run == nil {
		return
	}

	segments := getLeafSegments(s.Segments, nil)

	segmentMap := make(map[uuid.UUID]*Segment, len(segments))
	for _, seg := range segments {
		segmentMap[seg.ID] = seg
	}

	for id, split := range run.Splits {
		seg, ok := segmentMap[id]
		if !ok {
			continue
		}

		if seg.Gold <= 0 || split.CurrentDuration < seg.Gold {
			seg.Gold = split.CurrentDuration
		}
	}
}

func (s *SplitFile) UpdateRollingAverages() {
	averages := s.computeRollingAverages()

	segments := getLeafSegments(s.Segments, nil)

	for _, seg := range segments {
		if avg, ok := averages[seg.ID]; ok {
			seg.Average = avg
		} else if seg.Average <= 0 {
			seg.Average = 0
		}
	}
}

func (s *SplitFile) UpdatePB(pb *Run) {
	if pb == nil {
		return
	}

	if s.PB != nil && pb.TotalTime >= s.PB.TotalTime {
		return
	}

	s.PB = pb

	segments := getLeafSegments(s.Segments, nil)

	segmentMap := make(map[uuid.UUID]*Segment, len(segments))
	for _, seg := range segments {
		segmentMap[seg.ID] = seg
	}

	for id, split := range pb.Splits {
		seg, ok := segmentMap[id]
		if !ok {
			continue
		}

		if seg.PB <= 0 || split.CurrentDuration < seg.PB {
			seg.PB = split.CurrentDuration
		}
	}

	s.recalculateSOB()
}

func (s *SplitFile) RebuildStatistics() {
	golds := s.computeGolds()
	averages := s.computeRollingAverages()

	segments := getLeafSegments(s.Segments, nil)

	for _, seg := range segments {
		if gold, ok := golds[seg.ID]; ok {
			seg.Gold = gold
		} else if seg.Gold <= 0 {
			seg.Gold = 0
		}

		if avg, ok := averages[seg.ID]; ok {
			seg.Average = avg
		} else if seg.Average <= 0 {
			seg.Average = 0
		}
	}

	s.recalculateSOB()
}

func (s *SplitFile) recalculateSOB() {
	var sob time.Duration

	for _, seg := range getLeafSegments(s.Segments, nil) {
		if seg.Gold > 0 {
			sob += seg.Gold
		}
	}

	s.SOB = sob
}
