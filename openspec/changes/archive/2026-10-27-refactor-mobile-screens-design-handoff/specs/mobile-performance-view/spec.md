# Spec Delta

## Purpose

Defines how the mobile app presents an athlete's own trainer-reported sport metrics (ADR-013), as a read-only view derived from server summaries and entries.

## ADDED Requirements

### Requirement: Performance shows the athlete's metric summaries
The Performance tab SHALL show one KPI card for each metric summary the server returns for the signed-in athlete. Each card SHALL show the metric name and unit from the catalog, the latest value, and the personal best when the metric has a direction. The app SHALL NOT compute summaries from entries itself.

#### Scenario: Athlete with summaries
- **WHEN** the server returns summaries for three metrics
- **THEN** three KPI cards are shown with each metric's latest value and unit

#### Scenario: Neutral metric
- **WHEN** a summary's best value is null
- **THEN** its card shows the latest value without a personal-best line

### Requirement: Metrics are presented as trainer-reported
Every metric entry SHALL be labelled "Reported by a trainer at <Club>", using the club name when it is known to the athlete and "a club trainer" otherwise. The trainer's identity SHALL NOT be shown. Metric entries SHALL NOT use achievement verification chips.

#### Scenario: Entry attribution
- **WHEN** an entry row is shown for an entry from a club the athlete belongs to
- **THEN** the row shows the measured date, value, and "Reported by a trainer at" that club's name
- **AND** no trainer name or identifier is shown

#### Scenario: No verification chip
- **WHEN** an entry row is shown
- **THEN** no Verified, Pending, Unverified, or Rejected chip is displayed on it

### Requirement: Athletes cannot enter metrics
The mobile app SHALL NOT offer the athlete any control to create, edit, or delete a metric entry.

#### Scenario: Looking for an entry action
- **WHEN** the athlete views the Performance tab in any state
- **THEN** no add, edit, or delete metric control is present

### Requirement: Metric trend for a selected metric
The Performance tab SHALL chart the entries of one selected metric in measured-date order, and a range control SHALL limit the chart to the selected period. Entries SHALL be fetched newest first in pages of at most 50. Fetching SHALL continue until the oldest loaded entry predates the range start or no pages remain. The all-time range SHALL stop after 200 entries and say that older entries are not shown.

#### Scenario: Selecting a metric
- **WHEN** the athlete selects a metric that has entries
- **THEN** the chart plots that metric's entries by measured date

#### Scenario: Changing the range
- **WHEN** the athlete switches the range control to a shorter period
- **THEN** entries measured before that period are not plotted

#### Scenario: Range spans more than one page
- **WHEN** the selected range contains 70 entries
- **THEN** a second page is fetched and all 70 entries are plotted

#### Scenario: Range already covered
- **WHEN** the first page's oldest entry predates the range start
- **THEN** no further page is requested

#### Scenario: All-time cap
- **WHEN** the athlete selects the all-time range for a metric with 300 entries
- **THEN** the newest 200 entries are plotted and a note says older entries are not shown

### Requirement: Performance empty state points to clubs
When the athlete has no metric summaries, the Performance tab SHALL show the empty state. Its primary action SHALL open the Clubs tab, and its secondary action SHALL open visibility settings.

#### Scenario: No metrics yet
- **WHEN** the server returns no summaries
- **THEN** the "No performance data yet" panel is shown
- **AND** "View clubs" opens the Clubs tab and "Manage visibility" opens visibility settings
