Feature: Seasonal interest
  As a gardener reconciling ornamental colour against a source's season grid
  I want each plant's season-by-season flower/foliage/fruit colour held apart from the job calendar
  So that the cheatsheet strip matches the source and the calendar stays a pure list of jobs

  Background:
    Given an apple species carrying a seasonal-interest grid and a job calendar

  Scenario: Seasonal interest is stored as its own field, separate from the calendar
    When I load the apple
    Then its calendar holds only actionable jobs
    And its seasonal interest lists "flower" in "spring"

  Scenario: The strip resolves each season's parts and colours from the grid
    When I load the apple
    Then in "autumn" the strip shows "fruit" coloured "orange, red"

  Scenario: A sparse cultivar inherits its species' seasonal interest
    When I load the "red-falstaff" cultivar
    Then its seasonal interest is inherited from "malus-domestica"

  Scenario: A later import overlays seasonal interest and leaves the calendar untouched
    When I import a seasonal-interest-only fragment for the apple
    Then its seasonal interest lists "flower" in "summer"
    And its job calendar is unchanged

  Scenario: Editing a plant's seasonal interest saves its own grid as hand-entered
    When I edit node "malus-domestica" seasonal interest to show "flower" coloured "white" in "summer"
    Then node "malus-domestica" records "flower" interest in "summer"
    And node "malus-domestica" seasonal interest is sourced from "manual"

  Scenario: Editing an inherited grid creates an override on the cultivar
    When I edit node "red-falstaff" seasonal interest to show "flower" coloured "blue" in "spring"
    Then node "red-falstaff" has its own seasonal interest
    And node "red-falstaff" seasonal interest is sourced from "manual"

  Scenario: Clearing a cultivar's seasonal-interest override re-inherits from the species
    When I give node "red-falstaff" its own seasonal interest then clear it
    Then node "red-falstaff" has no own seasonal interest
    And node "red-falstaff" resolves seasonal interest from "malus-domestica"
