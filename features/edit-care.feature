Feature: Edit a plant's maintenance care
  As a gardener tidying my job list
  I want to add, edit and remove the maintenance jobs on the cheatsheet's Care card
  So that last tweaks can be made in-app without re-importing a fragment

  Background:
    Given the store starts empty
    And a care job "task-prune" "Winter prune" on "apple" in months "1,2" cadence "once"

  Scenario: Editing a job's note and cadence saves it as hand-entered
    When I set care job "task-prune" note to "Cut to an outward bud" and cadence "ongoing"
    Then care job "task-prune" note is "Cut to an outward bud"
    And care job "task-prune" cadence is "ongoing"
    And care job "task-prune" is sourced from "manual"

  Scenario: An unchanged save writes nothing
    When I open and save the care editor without changes
    Then care job "task-prune" is sourced from "rhs"

  Scenario: Adding a maintenance job scopes it to the plant
    When I add a care job "Mulch" on "apple" in months "3"
    Then a care job on "apple" with action "Mulch" exists

  Scenario: Removing a job deletes it
    When I remove care job "task-prune"
    Then care job "task-prune" does not exist
