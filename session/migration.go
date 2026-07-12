package session

import (
	"time"

	"github.com/google/uuid"
	"github.com/zellydev-games/opensplit/logger"
)

// MergeStatistics copies statistics from an older split file into a newer one
// when segment IDs match.
func MergeStatistics(oldFile, newFile *SplitFile) {
	if oldFile == nil || newFile == nil {
		logger.Warn(logModule, "MergeStatistics called with nil split file")
		return
	}

	oldSegments := make(map[uuid.UUID]*Segment)
	indexSegments(oldFile.Segments, oldSegments)

	mergeSegments(newFile.Segments, oldSegments)
}

func indexSegments(segments []Segment, out map[uuid.UUID]*Segment) {
	for i := range segments {
		out[segments[i].ID] = &segments[i]

		if len(segments[i].Children) > 0 {
			indexSegments(segments[i].Children, out)
		}
	}
}

func mergeSegments(newSegments []Segment, old map[uuid.UUID]*Segment) {
	for i := range newSegments {
		newSeg := &newSegments[i]

		oldSeg, ok := old[newSeg.ID]
		if ok {
			mergeStatistic(&newSeg.Gold, oldSeg.Gold)
			mergeStatistic(&newSeg.Average, oldSeg.Average)
			mergeStatistic(&newSeg.PB, oldSeg.PB)
		}

		if len(newSeg.Children) > 0 {
			mergeSegments(newSeg.Children, old)
		}
	}
}

// UpgradeSplitFile migrates run history and statistics from an older split file
// to a newer version.
func UpgradeSplitFile(oldFile, newFile *SplitFile) {
	MergeStatistics(oldFile, newFile)

	newFile.Runs = oldFile.Runs
	newFile.Attempts = oldFile.Attempts
	newFile.PB = oldFile.PB
}

// mergeStatistic implements the migration rules.
//
// destination == 0
//
//	inherit previous value
//
// destination == -1
//
//	intentionally do not inherit
//
// destination > 0
//
//	preserve manual value
func mergeStatistic(dst *time.Duration, src time.Duration) bool {
	switch *dst {
	case -1:
		return false

	case 0:
		if src > 0 {
			*dst = src
		}
		return true

	default:
		return false
	}
}
