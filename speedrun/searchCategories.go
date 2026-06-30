package speedrun

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"
)

// example:
// {"data":[{"id":"vdo9j1dp","name":"Warpless No OoB","weblink":"https://www.speedrun.com/cm?h=Warpless_No_OoB\u0026x=vdo9j1dp","type":"per-game","rules":"Complete all six levels without exploiting any out-of-bounds glitches or warps. \r\n\r\nTiming Starts at Level 1 on the first frame the life counter is shown. \r\nTiming Ends at contact with the flagpole of Level 6.\r\n\r\nLevels must be done in order like a new game.\r\n\r\nTimes below 4:00.00 need a video.","players":{"type":"exactly","value":1},"miscellaneous":false,"links":[{"rel":"self","uri":"https://www.speedrun.com/api/v1/categories/vdo9j1dp"},{"rel":"game","uri":"https://www.speedrun.com/api/v1/games/4d74xld7"},{"rel":"variables","uri":"https://www.speedrun.com/api/v1/categories/vdo9j1dp/variables"},{"rel":"records","uri":"https://www.speedrun.com/api/v1/categories/vdo9j1dp/records"},{"rel":"runs","uri":"https://www.speedrun.com/api/v1/runs?category=vdo9j1dp"},{"rel":"leaderboard","uri":"https://www.speedrun.com/api/v1/leaderboards/4d74xld7/category/vdo9j1dp"}]},{"id":"vdorp6dp","name":"Warpless","weblink":"https://www.speedrun.com/cm?h=Warpless\u0026x=vdorp6dp","type":"per-game","rules":"Complete all six levels without warps.\r\n\r\nTiming Starts at Level 1 on the first frame the life counter is shown. \r\nTiming Ends at contact with the flagpole of Level 6.\r\n\r\nLevels must be done in order like a new game.\r\n\r\nTimes below 4:00.00 need a video.","players":{"type":"exactly","value":1},"miscellaneous":false,"links":[{"rel":"self","uri":"https://www.speedrun.com/api/v1/categories/vdorp6dp"},{"rel":"game","uri":"https://www.speedrun.com/api/v1/games/4d74xld7"},{"rel":"variables","uri":"https://www.speedrun.com/api/v1/categories/vdorp6dp/variables"},{"rel":"records","uri":"https://www.speedrun.com/api/v1/categories/vdorp6dp/records"},{"rel":"runs","uri":"https://www.speedrun.com/api/v1/runs?category=vdorp6dp"},{"rel":"leaderboard","uri":"https://www.speedrun.com/api/v1/leaderboards/4d74xld7/category/vdorp6dp"}]},{"id":"5dwpyynk","name":"Individual Level","weblink":"https://www.speedrun.com/cm/levels?h=Individual_Level\u0026x=5dwpyynk","type":"per-level","rules":null,"players":{"type":"exactly","value":1},"miscellaneous":false,"links":[{"rel":"self","uri":"https://www.speedrun.com/api/v1/categories/5dwpyynk"},{"rel":"game","uri":"https://www.speedrun.com/api/v1/games/4d74xld7"},{"rel":"variables","uri":"https://www.speedrun.com/api/v1/categories/5dwpyynk/variables"},{"rel":"records","uri":"https://www.speedrun.com/api/v1/categories/5dwpyynk/records"},{"rel":"runs","uri":"https://www.speedrun.com/api/v1/runs?category=5dwpyynk"}]},{"id":"n2y5jr1k","name":"Any%","weblink":"https://www.speedrun.com/cm?h=Any\u0026x=n2y5jr1k","type":"per-game","rules":"","players":{"type":"exactly","value":1},"miscellaneous":false,"links":[{"rel":"self","uri":"https://www.speedrun.com/api/v1/categories/n2y5jr1k"},{"rel":"game","uri":"https://www.speedrun.com/api/v1/games/4d74xld7"},{"rel":"variables","uri":"https://www.speedrun.com/api/v1/categories/n2y5jr1k/variables"},{"rel":"records","uri":"https://www.speedrun.com/api/v1/categories/n2y5jr1k/records"},{"rel":"runs","uri":"https://www.speedrun.com/api/v1/runs?category=n2y5jr1k"},{"rel":"leaderboard","uri":"https://www.speedrun.com/api/v1/leaderboards/4d74xld7/category/n2y5jr1k"}]},{"id":"n2y3zyzd","name":"All Checkpoints","weblink":"https://www.speedrun.com/cm?h=All_Checkpoints\u0026x=n2y3zyzd","type":"per-game","rules":"Beat the game while collecting all five checkpoints.\r\n\r\nTiming Starts at Level 1 on the first frame the life counter is shown. \r\nTiming Ends at contact with the flagpole of Level 6.\r\n\r\nSubmissions require a video.","players":{"type":"exactly","value":1},"miscellaneous":true,"links":[{"rel":"self","uri":"https://www.speedrun.com/api/v1/categories/n2y3zyzd"},{"rel":"game","uri":"https://www.speedrun.com/api/v1/games/4d74xld7"},{"rel":"variables","uri":"https://www.speedrun.com/api/v1/categories/n2y3zyzd/variables"},{"rel":"records","uri":"https://www.speedrun.com/api/v1/categories/n2y3zyzd/records"},{"rel":"runs","uri":"https://www.speedrun.com/api/v1/runs?category=n2y3zyzd"},{"rel":"leaderboard","uri":"https://www.speedrun.com/api/v1/leaderboards/4d74xld7/category/n2y3zyzd"}]}]}

type CategorySearchResult struct {
	Data []CategorySearchItem `json:"data"`
}

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
	log.Println(endpoint)

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
	defer resp.Body.Close()

	fmt.Printf("Response Status: %s\n", resp.Status)
	if resp.StatusCode != http.StatusOK {
		return CategorySearchResult{}, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var result CategorySearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return CategorySearchResult{}, err
	}

	log.Println(result)
	return result, nil
}
