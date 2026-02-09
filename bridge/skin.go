package bridge

import (
	"github.com/zellydev-games/opensplit/logger"
)

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
				return
			}
			c.runtimeProvider.EventsEmit("skin:update", updatedSkinAddress)
		}
	}()
	logger.Debug(logModule, "skin UI pump started")
}
