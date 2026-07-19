Feature: Edit a plant's position independently of its conditions
  As a gardener correcting a plant by hand
  I want light/aspect/exposure/hardiness (position) to be a separate field from soil/moisture/pH
  So that I can inherit one and override the other — changing position never disturbs conditions

  Background:
    Given a rose species carrying its own position and conditions, and a sparse cultivar

  Scenario: Editing position saves its own field and leaves conditions untouched
    When I edit node "rosa" position setting light "full-sun" and hardiness "H6"
    Then node "rosa" light is "full-sun"
    And node "rosa" hardiness is "H6"
    And node "rosa" position is sourced from "manual"
    And node "rosa" conditions are still sourced from "plant-db"

  Scenario: Overriding an inherited position leaves conditions inheriting
    When I edit node "rosa-crimson" position setting light "partial-shade" and hardiness "H5"
    Then node "rosa-crimson" has its own position
    And node "rosa-crimson" light is "partial-shade"
    And node "rosa-crimson" owns no conditions
    And node "rosa-crimson" resolves soil "loam" from its parent

  Scenario: Overriding conditions leaves position inheriting
    When I set node "rosa-crimson" soil to "chalk"
    Then node "rosa-crimson" has its own conditions
    And node "rosa-crimson" owns no position
    And node "rosa-crimson" resolves light "partial-shade" from its parent

  Scenario: Clearing position removes only that field
    When I clear node "rosa" position
    Then node "rosa" owns no position
    And node "rosa" still has soil "loam"
    And node "rosa" conditions are still sourced from "plant-db"
