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

type gameSearchResponse struct {
	Data []gameSearchAPIItem `json:"data"`
}

type gameSearchAPIItem struct {
	ID          string          `json:"id"`
	Names       GameSearchNames `json:"names"`
	PlatformIDs []string        `json:"platforms"`
}

// GameSearchItem describes a speedrun.com game name.
type GameSearchNames struct {
	International string `json:"international"`
}

// GameSearchResult is the frontend-friendly representation of a game search.
type GameSearchResult struct {
	Data []GameSearchItem `json:"data"`
}

// GameSearchItem describes a speedrun.com game.
type GameSearchItem struct {
	ID        string          `json:"id"`
	Names     GameSearchNames `json:"names"`
	Platforms []Platforms     `json:"platforms"`
}

func (s *Service) SearchGames(query string) (GameSearchResult, error) {
	endpoint := fmt.Sprintf(
		"%s/games?name=%s&max=10",
		s.baseURL,
		url.QueryEscape(query),
	)
	logger.Debugf(logModule,
		"GET %s",
		endpoint,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return GameSearchResult{}, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Go-HTTPS-Client-Example")

	resp, err := s.client.Do(req)
	if err != nil {
		return GameSearchResult{}, err
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			logger.Debugf(logModule, "error closing response body: %v", err)
		}
	}()

	fmt.Printf("Response Status: %s\n", resp.Status)
	if resp.StatusCode != http.StatusOK {
		return GameSearchResult{}, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var api gameSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&api); err != nil {
		return GameSearchResult{}, err
	}
	logger.Debugf(logModule,
		"received %d games: example %v",
		len(api.Data),
		api.Data[0],
	)

	result := GameSearchResult{
		Data: make([]GameSearchItem, len(api.Data)),
	}

	for i, game := range api.Data {
		result.Data[i] = GameSearchItem{
			ID:        game.ID,
			Names:     game.Names,
			Platforms: s.getPlatformMatches(game.PlatformIDs),
		}
	}

	logger.Debugf(logModule,
		"filtered %d games: example %v",
		len(result.Data),
		result,
	)
	return result, nil
}
