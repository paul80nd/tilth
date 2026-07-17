Feature: Edit a plant's position
  As a gardener correcting a plant's growing position by hand
  I want to edit light, aspect, exposure and hardiness from the cheatsheet
  So that the Position card matches my plot — without disturbing the soil/moisture/pH it shares
  the conditions field with

  Background:
    Given a rose species carrying full conditions and a sparse cultivar

  Scenario: Editing position saves the node's own conditions and keeps soil/moisture/pH
    When I edit node "rosa" position setting light "full-sun" and hardiness "H6"
    Then node "rosa" light is "full-sun"
    And node "rosa" hardiness is "H6"
    And node "rosa" still has soil "loam"
    And node "rosa" conditions are sourced from "manual"

  Scenario: Editing an inherited position creates an override on the cultivar
    When I edit node "rosa-crimson" position setting light "partial-shade" and hardiness "H5"
    Then node "rosa-crimson" has its own conditions
    And node "rosa-crimson" light is "partial-shade"
    And node "rosa-crimson" still has soil "loam"
    And node "rosa-crimson" conditions are sourced from "manual"
