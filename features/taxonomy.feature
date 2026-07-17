Feature: Taxonomy view — the taxonomy as an expandable tree
  As a gardener reconciling my collection against my source sheet
  I want every plant laid out as a tree with its facets rolled up from its ancestors
  So that I can scan the whole record and see what each plant inherits

  Background:
    Given the store starts empty

  Scenario: Nodes nest into a family → genus → species → cultivar tree
    Given these nodes exist:
      | id                | rank     | parentId        | name          |
      | rosaceae          | family   |                 | Rosaceae      |
      | malus             | genus    | rosaceae        | Malus         |
      | malus-domestica   | species  | malus           | Apple         |
      | apple-red-falstaff| cultivar | malus-domestica | Apple         |
    When I build the taxonomy tree
    Then "malus-domestica" is a descendant of "rosaceae"
    And "apple-red-falstaff" is at depth 3

  Scenario: Structural orphans are grouped under an Unknown family bucket
    Given these nodes exist:
      | id              | rank    | parentId | name     |
      | rosaceae        | family  |          | Rosaceae |
      | malus           | genus   | rosaceae | Malus    |
      | malus-domestica | species | malus    | Apple    |
      | floating-basil  | species |          | Basil    |
    When I build the taxonomy tree with the unplaced bucket
    Then "floating-basil" is a descendant of "__unknown-family__"
    And "malus-domestica" is a descendant of "rosaceae"

  Scenario: A cultivar's facets roll up from its ancestors
    Given these nodes exist:
      | id                | rank     | parentId        | name  |
      | malus             | genus    |                 | Malus |
      | malus-domestica   | species  | malus           | Apple |
      | apple-red-falstaff| cultivar | malus-domestica | Apple |
    And node "malus" has hardiness "H6"
    And node "malus-domestica" has category "fruit"
    When I build the taxonomy tree
    Then the resolved node "apple-red-falstaff" has hardiness "H6"
    And the resolved node "apple-red-falstaff" has category "fruit"
