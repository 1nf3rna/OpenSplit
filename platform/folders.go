package platform

import (
	"os/exec"
	"runtime"

	"github.com/zellydev-games/opensplit/config"
	"github.com/zellydev-games/opensplit/logger"
)

// FolderProvider opens configured application folders using the host OS.
type FolderProvider struct {
	splitfileDir string
	skinsDir     string
}

func NewFolderProvider(config *config.Service) *FolderProvider {
	return &FolderProvider{
		splitfileDir: config.SplitFileDir,
		skinsDir:     config.SkinsDir,
	}
}

func (f *FolderProvider) OpenSplitFileDir() {
	openFolder(f.splitfileDir)
}

func (f *FolderProvider) OpenSkinsDir() {
	openFolder(f.skinsDir)
}

func openFolder(path string) {
	logger.Debugf(logModule, "opening folder %q", path)
	switch runtime.GOOS {
	case "windows":
		err := exec.Command("explorer", path).Start()
		if err != nil {
			logger.Errorf(logModule, "Failed to open file explorer: %v", err)
		}
	case "darwin":
		err := exec.Command("open", path).Start()
		if err != nil {
			logger.Errorf(logModule, "Failed to open file explorer: %v", err)
		}
	case "linux":
		err := exec.Command("xdg-open", path).Start()
		if err != nil {
			logger.Errorf(logModule, "Failed to open file explorer: %v", err)
		}
	default:
		logger.Warnf(logModule, "unsupported platform: %s", runtime.GOOS)
	}
}
