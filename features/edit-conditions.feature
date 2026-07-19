Feature: Edit a plant's growing conditions
  As a gardener correcting a plant by hand
  I want to edit soil, moisture and pH from the cheatsheet
  So that the Conditions card matches my plot — without disturbing the position it no longer shares a field with

  Background:
    Given a rose species carrying its own conditions and position, and a sparse cultivar

  Scenario: Editing conditions saves its own field and leaves position untouched
    When I edit node "rosa" conditions setting soil "clay" and ph "acid"
    Then node "rosa" has soil "clay"
    And node "rosa" has ph "acid"
    And node "rosa" conditions are sourced from "manual"
    And node "rosa" position is still sourced from "plant-db"

  Scenario: Editing an inherited card creates a conditions override on the cultivar
    When I edit node "rosa-crimson" conditions setting soil "chalk" and ph "alkaline"
    Then node "rosa-crimson" has its own conditions
    And node "rosa-crimson" has soil "chalk"
    And node "rosa-crimson" owns no position

  Scenario: Clearing conditions removes only that field
    When I clear node "rosa" conditions
    Then node "rosa" has no soil recorded
    And node "rosa" still has its position
