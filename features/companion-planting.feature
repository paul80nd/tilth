Feature: Flag good and bad companions sharing a bed
  As a gardener laying plants out together
  I want to know which plants help or hinder each other in the same bed
  So that I put good neighbours together and keep antagonists apart

  Background:
    Given the store starts empty
    And the companion test plants
    And a "free" bed "bed1"

  Scenario: Good companions sharing a bed are recommended
    Given "onion" placed on "bed1"
    And "carrot" placed on "bed1"
    When I check companions for 2026
    Then "bed1" recommends "onion" with "carrot"

  Scenario: Antagonists sharing a bed are flagged
    Given "onion" placed on "bed1"
    And "bean" placed on "bed1"
    When I check companions for 2026
    Then "bed1" warns against "onion" next to "bean"
    And "bed1" is flagged for companions

  Scenario: A cultivar pairs via its inherited genus
    Given "kale" placed on "bed1"
    And "nasturtium" placed on "bed1"
    When I check companions for 2026
    Then "bed1" recommends "kale" with "nasturtium"

  Scenario: Plants in separate beds are not companions
    Given "onion" placed on "bed1"
    And a second "free" bed "bed2"
    And "carrot" placed on "bed2"
    When I check companions for 2026
    Then there are no companion pairings

  Scenario: A lone plant has no companions
    Given "onion" placed on "bed1"
    When I check companions for 2026
    Then "bed1" has no companion notes
