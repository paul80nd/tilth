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
