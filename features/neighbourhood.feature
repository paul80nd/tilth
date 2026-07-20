Feature: The cheatsheet's local taxonomy neighbourhood
  As a gardener looking at one plant's cheatsheet
  I want to see the family, genus and the other species and cultivars in that genus
  So that I can place the plant in its local neighbourhood and jump to a relative

  Background:
    Given the store starts empty
    And the Malus genus with two apple species and their cultivars

  Scenario: A cultivar's neighbourhood is its whole genus subtree
    When I look at the neighbourhood of "apple-red"
    Then the neighbourhood family is "rosaceae"
    And the neighbourhood genus is "malus"
    And the neighbourhood species are "apple,crab"
    And the neighbourhood species "apple" has cultivars "apple-red,apple-sweet"

  Scenario: A family has no genus neighbourhood
    When I look at the neighbourhood of "rosaceae"
    Then there is no neighbourhood
