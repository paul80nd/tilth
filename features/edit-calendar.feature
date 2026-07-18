Feature: Edit a plant's 12-month calendar
  As a gardener recording when a plant's jobs happen
  I want to edit the sow/plant/harvest months from the cheatsheet
  So that the calendar bar matches what I do

  Background:
    Given an apple species carrying a calendar and a sparse cultivar

  Scenario: Editing the calendar saves the node's own calendar as hand-entered
    When I edit node "malus" calendar setting harvest in months "9,10"
    Then node "malus" has harvest in months "9,10"
    And node "malus" calendar is sourced from "manual"

  Scenario: Editing an inherited calendar creates an override on the cultivar
    When I edit node "malus-crimson" calendar setting harvest in months "8"
    Then node "malus-crimson" has its own calendar
    And node "malus-crimson" has harvest in months "8"
    And node "malus-crimson" calendar is sourced from "manual"
