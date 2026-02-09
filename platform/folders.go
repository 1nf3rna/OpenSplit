package platform

import (
	"os/exec"
	"runtime"

	"github.com/zellydev-games/opensplit/config"
)

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
	switch runtime.GOOS {
	case "windows":
		_ = exec.Command("explorer", path).Start()
	case "darwin":
		_ = exec.Command("open", path).Start()
	case "linux":
		_ = exec.Command("xdg-open", path).Start()
	}
}
