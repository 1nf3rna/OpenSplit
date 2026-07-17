package bridge

import (
	"github.com/zellydev-games/opensplit/logger"
)

// Skin forwards skin updates to the frontend.
type Skin struct {
	runtimeProvider RuntimeProvider
	skinUpdatedCh   <-chan string
}

func NewSkin(skinUpdateCh <-chan string, runtimeProvider RuntimeProvider) *Skin {
	return &Skin{
		runtimeProvider: runtimeProvider,
		skinUpdatedCh:   skinUpdateCh,
	}
}

func (c *Skin) StartUIPump() {
	go func() {
		for {
			updatedSkinAddress, ok := <-c.skinUpdatedCh
			if !ok {
				logger.Debug(logModule, "skin UI pump stopped")
				return
			}
			c.runtimeProvider.EventsEmit("skin:update", updatedSkinAddress)
		}
	}()
	logger.Debug(logModule, "skin UI pump started")
}
