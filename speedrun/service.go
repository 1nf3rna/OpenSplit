package speedrun

import (
	"net/http"
	"time"

	"github.com/zellydev-games/opensplit/logger"
)

const logModule = "main"

const speedRunBase = "https://www.speedrun.com/api/v1"

type Service struct {
	baseURL string
	client  *http.Client

	platforms map[string]string
}

func NewService() *Service {
	return &Service{
		baseURL: speedRunBase,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *Service) Startup() error {
	platforms, err := s.fetchPlatforms()
	if err != nil {
		logger.Errorf(logModule, "failed to load speedrun platforms: %v", err)
		return err
	}

	s.platforms = make(map[string]string, len(platforms.Data))
	for _, p := range platforms.Data {
		s.platforms[p.ID] = p.Name
	}

	return nil
}
