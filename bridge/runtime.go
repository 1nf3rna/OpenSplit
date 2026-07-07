package bridge

const logModule = "bridge"

// RuntimeProvider represents the subset of the Wails runtime used by the bridge.
type RuntimeProvider interface {
	EventsEmit(string, ...any)
}
