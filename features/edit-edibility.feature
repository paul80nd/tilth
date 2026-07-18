Feature: Edit a plant's edibility
  As a gardener recording what's edible and any caution
  I want to edit the edible parts and toxicity note from the cheatsheet
  So that the Edibility card matches what I know

  Background:
    Given a rhubarb species carrying edibility and a sparse cultivar

  Scenario: Editing edibility saves the node's own parts and caution as hand-entered
    When I edit node "rheum" edibility setting edible "stems, young shoots" and caution "Leaves are toxic"
    Then node "rheum" edible is "stems, young shoots"
    And node "rheum" caution is "Leaves are toxic"
    And node "rheum" edible is sourced from "manual"

  Scenario: Editing inherited edibility creates an override on the cultivar
    When I edit node "rheum-victoria" edibility setting edible "stalks" and caution "Leaves are toxic"
    Then node "rheum-victoria" has its own edible
    And node "rheum-victoria" edible is "stalks"

  Scenario: Clearing an edibility override re-inherits both fields from the species
    When I give node "rheum-victoria" its own edibility then clear it
    Then node "rheum-victoria" has no own edible
    And node "rheum-victoria" has no own toxicity
    And node "rheum-victoria" resolves edible "stems" from the species
