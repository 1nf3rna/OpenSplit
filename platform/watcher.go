package platform

import (
	"io/fs"
	"path/filepath"
	"sync"
	"time"

	"github.com/zellydev-games/opensplit/logger"
)

type DirChangeTracker struct {
	m           sync.Mutex
	root        string
	startupOnce sync.Once
	last        map[string]time.Time
}

func NewDirChangeTracker() *DirChangeTracker {
	return &DirChangeTracker{
		last: make(map[string]time.Time),
	}
}

func (t *DirChangeTracker) Start(rootDir string, callback func()) {
	t.root = rootDir
	t.startupOnce.Do(func() {
		go func() {
			for {
				check, err := t.check()
				if err != nil {
					logger.Errorf(logModule, "error checking dir for changes: %v", err)
					time.Sleep(time.Second * 2)
					continue
				}
				if check {
					callback()
				}
				time.Sleep(1 * time.Second)
			}
		}()
	})

}

func (t *DirChangeTracker) ChangeRoot(rootDir string) {
	t.m.Lock()
	t.root = rootDir
	t.m.Unlock()
}

// check scans the directory, compares it to the previous scan, updates internal state,
// and returns true if any file was added, removed, or modified since the last check.
func (t *DirChangeTracker) check() (bool, error) {
	current := make(map[string]time.Time)
	t.m.Lock()
	r := t.root
	t.m.Unlock()

	err := filepath.WalkDir(r, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		info, err := d.Info()
		if err != nil {
			return err
		}
		current[path] = info.ModTime()
		return nil
	})
	if err != nil {
		return false, err
	}

	changed := false

	// additions / modifications
	for path, mod := range current {
		prev, ok := t.last[path]
		if !ok || !mod.Equal(prev) {
			changed = true
			break
		}
	}

	// deletions (only check if we haven't already detected a change)
	if !changed {
		for path := range t.last {
			if _, ok := current[path]; !ok {
				changed = true
				break
			}
		}
	}

	// update internal state no matter what
	t.last = current
	return changed, nil
}
