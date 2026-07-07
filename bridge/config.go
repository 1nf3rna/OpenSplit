package bridge

import (
	"github.com/zellydev-games/opensplit/config"
	"github.com/zellydev-games/opensplit/logger"
)

// Config forwards configuration updates to the frontend.
type Config struct {
	runtimeProvider      RuntimeProvider
	configUpdatedChannel <-chan *config.Service
}

func NewConfig(configUpdatedChannel <-chan *config.Service, runtimeProvider RuntimeProvider) *Config {
	return &Config{runtimeProvider: runtimeProvider, configUpdatedChannel: configUpdatedChannel}
}

// StartUIPump begins forwarding configuration updates to the UI.
func (c *Config) StartUIPump() {
	go func() {
		for {
			updatedConfig, ok := <-c.configUpdatedChannel
			if !ok {
				logger.Debug(logModule, "config UI pump stopped")
				return
			}
			c.runtimeProvider.EventsEmit("config:update", updatedConfig)
		}
	}()
	logger.Debug(logModule, "config UI pump started")
}
