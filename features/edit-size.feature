Feature: Edit a plant's ultimate size
  As a gardener recording how big a plant gets
  I want to edit height, spread and time-to-size from the cheatsheet
  So that the to-scale Size card matches what I know

  Background:
    Given an apple species carrying a size and a sparse cultivar

  Scenario: Editing size saves the node's own size as hand-entered
    When I edit node "malus" size setting height "3-5m" and spread "4m"
    Then node "malus" height is "3-5m"
    And node "malus" spread is "4m"
    And node "malus" size is sourced from "manual"

  Scenario: Editing an inherited size creates an override on the cultivar
    When I edit node "malus-crimson" size setting height "2m" and spread "1.5m"
    Then node "malus-crimson" has its own size
    And node "malus-crimson" height is "2m"
    And node "malus-crimson" size is sourced from "manual"

  Scenario: Clearing a cultivar's size override re-inherits from the species
    When I give node "malus-crimson" its own size then clear it
    Then node "malus-crimson" has no own size
    And node "malus-crimson" resolves height "2-4m" from the species
