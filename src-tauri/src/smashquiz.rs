use std::collections::HashMap;

use serde::ser::SerializeStruct;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Team named {0:?} not found")]
    TeamNotFound(String),
    #[error("Team named {0:?} is not active")]
    TeamNotActive(String),
}

type Teams<Team> = HashMap<String, Team>;

pub trait Rule<Team> {
    /// Initialize a new team state
    fn new_state(&self, name: &str) -> Team;
    /// Damage the attacked teams when the answer is correct
    fn damage_if_correct(&self, attacked: &mut HashMap<String, Team>);
    /// Damage the attacker team when the answer is incorrect
    fn damage_if_incorrect(&self, attacker: &mut Team);
    /// Perform the smash without checking if it will be successful
    fn do_smash(&self, attacker: &mut Team, attacked: &mut HashMap<String, Team>);
    /// Check if the smash will be successful
    fn judge_smash_success(&self, attacker: &Team, attacked: &Team) -> bool;
    /// Check if the player is active
    fn team_is_active(&self, attacker: &Team) -> bool;
}

pub struct GameManager<State: Clone, R: Rule<State> + Clone> {
    pub teams: Teams<State>,
    pub rule: R,
}

impl<State: serde::Serialize + Clone, R: Rule<State> + serde::Serialize + Clone> serde::Serialize
    for GameManager<State, R>
{
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut s = serializer.serialize_struct("TeamManager", 2)?;
        s.serialize_field("teams", &self.teams)?;
        s.serialize_field("rule", &self.rule)?;
        s.end()
    }
}

impl<
        'de,
        State: serde::de::DeserializeOwned + Clone,
        R: Rule<State> + serde::de::DeserializeOwned + Clone,
    > serde::Deserialize<'de> for GameManager<State, R>
{
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(serde::Deserialize)]
        struct TeamManagerHelper<State, R> {
            teams: Teams<State>,
            rule: R,
        }
        let helper = TeamManagerHelper::deserialize(deserializer)?;
        Ok(GameManager {
            teams: helper.teams,
            rule: helper.rule,
        })
    }
}

impl<State: Clone, R: Clone + Rule<State>> Clone for GameManager<State, R> {
    fn clone(&self) -> Self {
        GameManager {
            teams: self.teams.clone(),
            rule: self.rule.clone(),
        }
    }
}

impl<TeamState: Clone, R: Rule<TeamState> + Clone> GameManager<TeamState, R> {
    /// Create a new team manager
    pub fn new(rule: R, names: impl IntoIterator<Item = String>) -> GameManager<TeamState, R> {
        let teams = names
            .into_iter()
            .map(|name| {
                let state = rule.new_state(&name);
                (name, state)
            })
            .collect();
        GameManager { teams, rule }
    }

    /// Damage the other teams
    pub fn damage(&mut self, attacker: &str, correct: bool) -> Result<Teams<TeamState>, Error> {
        let Some(mut attacker_state) = self.teams.remove(attacker) else {
            return Err(Error::TeamNotFound(attacker.to_string()));
        };
        if !self.rule.team_is_active(&attacker_state) {
            return Err(Error::TeamNotActive(attacker.to_string()));
        }
        let update = if correct {
            self.rule.damage_if_correct(&mut self.teams);
            // Report the updated states (all other teams)
            self.teams.clone()
        } else {
            self.rule.damage_if_incorrect(&mut attacker_state);
            // Report the updated states (attacker only)
            HashMap::from([(attacker.to_string(), attacker_state.clone())])
        };
        self.teams.insert(attacker.to_string(), attacker_state);
        Ok(update)
    }

    /// Smash the other teams
    pub fn smash(&mut self, attacker: &str, correct: bool) -> Result<Teams<TeamState>, Error> {
        let Some(mut attacker_state) = self.teams.remove(attacker) else {
            return Err(Error::TeamNotFound(attacker.to_string()));
        };
        if !self.rule.team_is_active(&attacker_state) {
            return Err(Error::TeamNotActive(attacker.to_string()));
        }
        let update = if correct {
            let mut victim = HashMap::new();
            let mut not_victim = HashMap::new();
            // Split the teams into victims and not victims
            for (name, state) in self.teams.drain() {
                if self.rule.judge_smash_success(&attacker_state, &state) {
                    victim.insert(name, state);
                } else {
                    not_victim.insert(name, state);
                }
            }
            self.rule.do_smash(&mut attacker_state, &mut victim);
            // Report the updated states (attacker + victims)
            let mut update = victim.clone();
            update.insert(attacker.to_string(), attacker_state.clone());
            // Merge the teams back together
            self.teams.extend(not_victim);
            self.teams.extend(victim);
            update
        } else {
            self.rule.damage_if_incorrect(&mut attacker_state);
            // Report the updated states (attacker only)
            HashMap::from([(attacker.to_string(), attacker_state.clone())])
        };
        self.teams.insert(attacker.to_string(), attacker_state);
        Ok(update)
    }
}
