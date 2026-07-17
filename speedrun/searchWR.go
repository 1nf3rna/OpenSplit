package speedrun

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/zellydev-games/opensplit/logger"
)

// WRSearchResult is the frontend-friendly representation of the WR search.
type WRSearchResult struct {
	Data []WRSearchItem `json:"data"`
}

// WRSearchItem describes a speedrun.com WR.
type WRSearchItem struct {
	Runs    []WRSearchRuns `json:"runs"`
	Players WRPlayerEmbed  `json:"players"`
}

// WRPlayerEmbed describes a speedrun.com player array.
type WRPlayerEmbed struct {
	Data []WRPlayer `json:"data"`
}

// WRPlayer describes a speedrun.com player.
type WRPlayer struct {
	Names WRPlayerNames `json:"names"`
}

// WRPlayerNames describes a speedrun.com player's names.
type WRPlayerNames struct {
	International string `json:"international"`
}

// WRSearchRuns describes a speedrun.com WR runs.
type WRSearchRuns struct {
	Place int   `json:"place"`
	Run   WRRun `json:"run"`
}

// WRRun describes a speedrun.com WR run.
type WRRun struct {
	ID   string `json:"id"`
	Time WRTime `json:"times"`
}

// WRTime describes a speedrun.com WR run time.
type WRTime struct {
	RealTime float64 `json:"realtime_t"`
	InGame   float64 `json:"ingame_t"`
}

func (s *Service) SearchWR(categoryID string) (WRSearchResult, error) {
	endpoint := fmt.Sprintf(
		"%s/categories/%s/records?top=1&embed=players",
		s.baseURL,
		url.QueryEscape(categoryID),
	)
	logger.Debugf(logModule,
		"GET %s",
		endpoint,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return WRSearchResult{}, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Go-HTTPS-Client-Example")

	resp, err := s.client.Do(req)
	if err != nil {
		return WRSearchResult{}, err
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			logger.Errorf(logModule, "error closing response body: %v", err)
		}
	}()

	fmt.Printf("Response Status: %s\n", resp.Status)
	if resp.StatusCode != http.StatusOK {
		return WRSearchResult{}, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var result WRSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return WRSearchResult{}, err
	}

	logger.Debugf(logModule,
		"received WR: %v",
		result,
	)
	return result, nil
}
