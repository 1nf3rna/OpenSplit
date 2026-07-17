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

// CategorySearchResult is the frontend-friendly representation of a category search.
type CategorySearchResult struct {
	Data []CategorySearchItem `json:"data"`
}

// CategorySearchItem describes a speedrun.com category.
type CategorySearchItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (s *Service) SearchCategories(gameID string) (CategorySearchResult, error) {
	endpoint := fmt.Sprintf(
		"%s/games/%s/categories",
		s.baseURL,
		url.QueryEscape(gameID),
	)
	logger.Debugf(logModule,
		"GET %s",
		endpoint,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return CategorySearchResult{}, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Go-HTTPS-Client-Example")

	resp, err := s.client.Do(req)
	if err != nil {
		return CategorySearchResult{}, err
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			logger.Debugf(logModule, "error closing response body: %v", err)
		}
	}()

	fmt.Printf("Response Status: %s\n", resp.Status)
	if resp.StatusCode != http.StatusOK {
		return CategorySearchResult{}, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var result CategorySearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return CategorySearchResult{}, err
	}
	logger.Debugf(logModule,
		"received %d categories: example %v",
		len(result.Data),
		result.Data[0],
	)

	return result, nil
}
