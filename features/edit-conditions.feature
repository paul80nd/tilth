Feature: Edit a plant's growing conditions
  As a gardener correcting a plant's soil requirements by hand
  I want to edit soil, moisture and pH from the cheatsheet
  So that the Conditions card matches my plot — without disturbing the light/aspect/exposure/
  hardiness it shares the conditions field with

  Background:
    Given a rose species carrying full conditions and a sparse cultivar

  Scenario: Editing conditions saves the node's own conditions and keeps the position facets
    When I edit node "rosa" conditions setting soil "sand" and ph "acid"
    Then node "rosa" has soil "sand"
    And node "rosa" has ph "acid"
    And node "rosa" still has hardiness "H4"
    And node "rosa" conditions are sourced from "manual"

  Scenario: Editing an inherited card creates a conditions override on the cultivar
    When I edit node "rosa-crimson" conditions setting soil "clay" and ph "alkaline"
    Then node "rosa-crimson" has its own conditions
    And node "rosa-crimson" has soil "clay"
    And node "rosa-crimson" still has hardiness "H4"
    And node "rosa-crimson" conditions are sourced from "manual"
