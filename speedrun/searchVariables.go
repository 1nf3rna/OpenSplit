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

// VariablesSearchResult is the frontend-friendly representation of a variable search for a category.
type VariablesSearchResult struct {
	Data []VariableItem `json:"data"`
}

// VariableItem describes a speedrun.com variable.
type VariableItem struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	Category      *string        `json:"category"`
	IsSubcategory bool           `json:"is-subcategory"`
	Scope         VariableScope  `json:"scope"`
	Mandatory     bool           `json:"mandatory"`
	Values        VariableValues `json:"values"`
}

type VariableScope struct {
	Type string `json:"type"`
}

type VariableValues struct {
	Default *string                  `json:"default"`
	Values  map[string]VariableValue `json:"values"`
}

type VariableValue struct {
	Label string `json:"label"`
}

func (s *Service) SearchVariables(category string) (VariablesSearchResult, error) {
	endpoint := fmt.Sprintf(
		"%s/categories/%s/variables",
		s.baseURL,
		url.QueryEscape(category),
	)

	logger.Debugf(logModule,
		"GET %s",
		endpoint,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return VariablesSearchResult{}, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Go-HTTPS-Client-Example")

	resp, err := s.client.Do(req)
	if err != nil {
		return VariablesSearchResult{}, err
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			logger.Debugf(logModule, "error closing response body: %v", err)
		}
	}()

	fmt.Printf("Response Status: %s\n", resp.Status)
	if resp.StatusCode != http.StatusOK {
		return VariablesSearchResult{}, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var result VariablesSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return VariablesSearchResult{}, err
	}
	logger.Debugf(logModule,
		"received %d variables: example %v",
		len(result.Data),
		result.Data[0],
	)

	return result, nil
}
