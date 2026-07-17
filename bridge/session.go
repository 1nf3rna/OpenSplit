package bridge

import (
	"github.com/zellydev-games/opensplit/config"
	"github.com/zellydev-games/opensplit/dto"
	"github.com/zellydev-games/opensplit/logger"
	"github.com/zellydev-games/opensplit/repo/adapters"
	"github.com/zellydev-games/opensplit/session"
)

const uiModelEventName = "ui:model"

// Session forwards session updates to the frontend.
type Session struct {
	runtimeProvider       RuntimeProvider
	sessionUpdatedChannel chan *session.Service
}

func NewSession(sessionUpdatedChannel chan *session.Service, runtimeProvider RuntimeProvider) *Session {
	return &Session{
		runtimeProvider:       runtimeProvider,
		sessionUpdatedChannel: sessionUpdatedChannel,
	}
}

func (s *Session) StartUIPump() {
	go func() {
		for {
			updatedSession, ok := <-s.sessionUpdatedChannel
			if !ok {
				logger.Debug(logModule, "session UI pump stopped")
				return
			}
			s.runtimeProvider.EventsEmit("session:update", adapters.DomainToDTO(updatedSession))
		}
	}()
	logger.Debug(logModule, "session UI pump started")
}

// View identifies the current application screen.
type View string

const (
	AppViewWelcome       View = "welcome"
	AppViewNewSplitFile  View = "new-split-file"
	AppViewEditSplitFile View = "edit-split-file"
	AppViewRunning       View = "running"
	AppViewSettings      View = "settings"
)

// AppViewModel describes the UI state presented to the frontend.
type AppViewModel struct {
	View View `json:"view"`

	// Only set for editor screens
	SplitFile *dto.SplitFile `json:"splitFile,omitempty"`

	// Only set for running
	Session *dto.Session `json:"session,omitempty"`

	// Only set for settings
	Config *config.Service `json:"config,omitempty"`
}

// EmitUIEvent informs the frontend of a state change
func EmitUIEvent(runtimeProvider RuntimeProvider, model AppViewModel) {
	logger.Debugf(logModule, "setting UI model: %s", model.View)
	runtimeProvider.EventsEmit(uiModelEventName, model)
}
