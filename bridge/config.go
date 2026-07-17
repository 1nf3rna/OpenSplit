package bridge

import (
	"github.com/zellydev-games/opensplit/command"
	"github.com/zellydev-games/opensplit/config"
	"github.com/zellydev-games/opensplit/keyinfo"
	"github.com/zellydev-games/opensplit/logger"
)

const (
	ConfigUpdatedEvent        = "config:update"
	ConfigHotkeyRecordedEvent = "config:hotkey-recorded"
)

type HotkeyRecorded struct {
	Command command.Command `json:"command"`
	KeyInfo keyinfo.KeyData `json:"key_info"`
}

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
			c.runtimeProvider.EventsEmit(ConfigUpdatedEvent, updatedConfig)
		}
	}()
	logger.Debug(logModule, "config UI pump started")
}

func EmitHotkeyRecorded(runtimeProvider RuntimeProvider, cmd command.Command, key keyinfo.KeyData) {
	runtimeProvider.EventsEmit(ConfigHotkeyRecordedEvent, HotkeyRecorded{
		Command: cmd,
		KeyInfo: key,
	})
}
