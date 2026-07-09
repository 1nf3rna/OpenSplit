package session

// Package session contains runtime state and statistical calculations for split files.
//
// statistics.go contains incremental and full rebuild helpers for Gold, Personal Best,
// Rolling Average, and Sum of Best values.

import (
	"time"

	"github.com/google/uuid"
	"github.com/zellydev-games/opensplit/logger"
)

// UpdateGolds updates each segment's Gold split if the supplied run contains a faster
// segment time than the currently stored value.
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

// UpdateRollingAverages recalculates the rolling average for every leaf segment using
// the currently configured rolling average window.
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

// UpdatePB updates the split file's Personal Best run if the supplied run is faster
// than the existing PB and refreshes per-segment PB values.
func (s *SplitFile) UpdatePB(pb *Run) {
	if pb == nil {
		return
	}

	if s.PB != nil && pb.TotalTime >= s.PB.TotalTime {
		logger.Debug(logModule, "PB update skipped (existing PB is faster)")
		return
	}

	s.PB = pb
	logger.Infof(logModule,
		"new personal best: %dms",
		pb.TotalTime.Milliseconds(),
	)

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

		// if seg.PB <= 0 || split.CurrentDuration < seg.PB {
		seg.PB = split.CurrentDuration
		// }
	}

	s.recalculateSOB()
}

// RebuildStatistics recomputes all derived statistics from the run history.
//
// This performs a full rebuild of Golds, Rolling Averages, PB data, and Sum of Best.
// It should be called after bulk modifications to run history.
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
