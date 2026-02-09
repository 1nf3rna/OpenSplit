package skin

import (
	"fmt"
	"net"
	"net/http"

	"github.com/zellydev-games/opensplit/logger"
)

func (s *Service) InitListener() (error, int) {
	s.initOnce.Do(func() {
		fs := http.FileServer(http.Dir(s.skinDir))
		mux := http.NewServeMux()
		mux.Handle("/skin/", http.StripPrefix("/skin/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")

			fs.ServeHTTP(w, r)
		})))

		ln, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			s.initErr = err
			logger.Errorf(logModule, "error creating listener: %s", err.Error())
			return
		}
		s.listener = ln

		addr := ln.Addr().(*net.TCPAddr)
		s.port = addr.Port
		s.address = fmt.Sprintf("http://127.0.0.1:%d/skin/", s.port)
		s.server = &http.Server{Handler: mux}
		logger.Infof(logModule, "skin server setup on %s", s.address)
	})

	return s.initErr, s.port
}

func (s *Service) Serve() {
	s.serving.Store(true)
	go func() {
		err := s.server.Serve(s.listener)
		if err != nil {
			logger.Errorf(logModule, "error serving skin server: %s", err.Error())
		}

		s.serving.Store(false)
	}()
}

func (s *Service) Serving() bool {
	return s.serving.Load()
}

func (s *Service) Addr() string {
	return s.address
}
