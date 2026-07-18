Feature: Edit a plant's extra facts
  As a gardener recording odd cultivation facts
  I want to add, edit and remove the labelled facts on the cheatsheet
  So that the More facts card shows exactly the chips I want

  Background:
    Given a tomato species carrying facts and a sparse cultivar

  Scenario: Setting facts saves the node's own facts as hand-entered
    When I set node "solanum" facts to:
      | key         | value  |
      | spacing     | 45cm   |
      | germination | 7 days |
    Then node "solanum" fact "spacing" is "45cm"
    And node "solanum" fact "germination" is "7 days"
    And node "solanum" facts is sourced from "manual"

  Scenario: Removing a fact drops just that key
    When I set node "solanum" facts to:
      | key     | value |
      | spacing | 45cm  |
    Then node "solanum" fact "spacing" is "45cm"
    And node "solanum" has no fact "germination"

  Scenario: Clearing the facts override re-inherits from the species
    When I give node "solanum-gardeners" its own facts then clear it
    Then node "solanum-gardeners" has no own facts
    And node "solanum-gardeners" resolves fact "spacing" as "45cm" from the species
