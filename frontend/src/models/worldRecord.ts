/**
 * Cached world record information retrieved from
 * Speedrun.com.
 */

export default class WorldRecord {
    show = false;

    run_id = "";
    players: string[] = [];

    real_time = 0;
    in_game_time = 0;
}
