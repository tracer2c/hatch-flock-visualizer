# Hatchery Management System - All Formulas & Calculations

## Dashboard Overview Metrics

### 1. All Houses (Total Batches)
```
Formula: COUNT(all batches in database)
Location: src/components/dashboard/BatchOverviewDashboard.tsx (lines 151-162)
SQL: SELECT COUNT(*) FROM batches
```

### 2. Average Fertility
```
Formula: SUM(fertility_percent from all batches with fertility data) / COUNT(batches with fertility data)
Location: src/components/dashboard/BatchOverviewDashboard.tsx (lines 128-137)
Calculation: ROUND(SUM(fertility) / valid_batches.length)
Returns: Percentage (0-100)
```

### 3. Average Hatch Rate  
```
Formula: SUM(hatch_percent from all batches with hatch data) / COUNT(batches with hatch data)
Location: src/components/dashboard/BatchOverviewDashboard.tsx (lines 139-148)
Calculation: ROUND(SUM(hatch) / valid_batches.length)
Returns: Percentage (0-100)
```

### 4. System Utilization
```
Formula: AVG(machine utilization across all machines)
Location: src/components/dashboard/BatchOverviewDashboard.tsx (lines 150-158)
Calculation: ROUND(SUM(machine.utilization) / total_machines)
Where machine utilization = (active_batch_eggs / machine_capacity) × 100
Returns: Percentage (0-100)
Note: Returns 0% if no machines exist
```

## Machine Utilization (Per Machine)

### Individual Machine Utilization
```
Formula: (eggs_in_active_batch / machine_capacity) × 100
Location: src/hooks/useHouseData.ts (lines 417-453)
Calculation:
  - actual_utilization = (total_eggs_set / capacity) × 100
  - displayed_utilization = MIN(actual_utilization, 100)
  - is_over_capacity = actual_utilization > 100
Returns: Percentage (0-100, capped at 100 for display)
```

## Fertility Analysis Metrics

### Fertility Percentage
```
Formula: (fertile_eggs / sample_size) × 100
Table: fertility_analysis
Column: fertility_percent
Stored Value: Calculated at data entry
```

### Hatch of Fertile (HOF)
```
Formula: (fertile_eggs / sample_size) × 100
Table: fertility_analysis  
Column: hof_percent
Stored Value: Calculated at data entry
```

### Hatch of Incubated (HOI)  
```
Formula: (chicks_hatched / eggs_injected) × 100
Location: Calculated from batches table
Calculation: (batches.chicks_hatched / batches.eggs_injected) × 100
Returns: Percentage (0-100)
```

### Hatch Percentage
```
Formula: (chicks_hatched / fertile_eggs) × 100
Table: fertility_analysis
Column: hatch_percent
Stored Value: Calculated at data entry
```

### IF Development Percentage
```
Formula: (fertile_eggs - early_dead - late_dead) / fertile_eggs × 100
Table: fertility_analysis
Column: if_dev_percent  
Stored Value: Calculated at data entry
```

## Residue Analysis Metrics

### Residue Percentage
```
Formula: (total_residue_count / sample_size) × 100
Table: residue_analysis
Column: residue_percent
Stored Value: Calculated at data entry
```

### Embryonic Mortality Stages

#### Early Dead
```
Formula: (early_dead_count / fertile_eggs) × 100
Source: Direct count from candling/breakout
Table: fertility_analysis or residue_analysis
```

#### Mid Dead
```
Formula: (mid_dead_count / fertile_eggs) × 100
Source: Direct count from residue breakout
Table: residue_analysis
Column: mid_dead
```

#### Late Dead
```
Formula: (late_dead_count / fertile_eggs) × 100
Source: Direct count from residue breakout
Table: fertility_analysis or residue_analysis
```

#### Pipped
```
Formula: (pipped_not_hatched / fertile_eggs) × 100
Source: Count of eggs that pipped but didn't hatch
Table: residue_analysis
Column: pipped_not_hatched or pip_number
```

## Egg Pack Quality Metrics

### Quality Score (Egg Quality)
```
Formula: ((grade_a × 1.0 + grade_b × 0.8 + grade_c × 0.6) / sample_size) × 100
Location: Calculated in useComparisonData hook
Calculation:
  - Grade A eggs = 100% quality value
  - Grade B eggs = 80% quality value  
  - Grade C eggs = 60% quality value
  - Weighted average of all grades
Returns: Score (0-100)
```

### Defect Rates
```
Cracked Rate = (cracked / sample_size) × 100
Dirty Rate = (dirty / sample_size) × 100
Small Rate = (small / sample_size) × 100
Large Rate = (large / sample_size) × 100
```

## QA Monitoring Metrics

### Temperature Average
```
Formula: SUM(temperature readings) / COUNT(readings)
Table: qa_monitoring
Aggregation: Calculated over selected time period
```

### Humidity Average
```
Formula: SUM(humidity readings) / COUNT(readings)
Table: qa_monitoring  
Aggregation: Calculated over selected time period
```

### Mortality Count
```
Formula: SUM(mortality_count per check)
Table: qa_monitoring
Aggregation: Total across all QA checks for a batch
```

## Batch Performance Metrics

### Days Since Set
```
Formula: FLOOR((current_date - set_date) / 86400000 milliseconds)
Calculation: Difference in days from set date to now
Location: Calculated in various hooks and components
```

### Progress Percentage
```
Formula: (days_since_set / 21) × 100
Where 21 = standard incubation days
Location: useOngoingBatchMetrics hook
Returns: Percentage (0-100+, can exceed 100 if overdue)
```

### Batch Status Transitions
```
Planned → Setting (manual)
Setting → Incubating (after eggs loaded)
Incubating → Hatching (around day 18-19)
Hatching → Completed (after hatch completion)
```

## Unit/Hatchery Weekly Comparison

### Weekly Aggregations
```
Eggs Set (Weekly) = SUM(total_eggs_set) for batches set in week
Fertility (Weekly Avg) = AVG(fertility_percent) from fertility_analysis in week
Hatch Rate (Weekly Avg) = AVG(hatch_percent) from fertility_analysis in week  
Residue (Weekly Avg) = AVG(residue_percent) from residue_analysis in week
Temperature (Weekly Avg) = AVG(temperature) from qa_monitoring in week
Humidity (Weekly Avg) = AVG(humidity) from qa_monitoring in week
```

## Weight Tracking

### Percentage Weight Loss
```
Formula: ((initial_weight - current_weight) / initial_weight) × 100
Table: weight_tracking
Column: percent_loss
Calculation: Based on day 0 weight vs current check weight
```

### Total Weight
```
Formula: (top_weight + middle_weight + bottom_weight) / 3
Or: Direct entry of total sample weight
Table: weight_tracking
Column: total_weight
```

## Alert Thresholds

### Temperature Alerts
```
Trigger: temperature < min_temperature OR temperature > max_temperature
Source: alert_configs.min_temperature, alert_configs.max_temperature
Comparison: qa_monitoring.temperature
```

### Humidity Alerts
```
Trigger: humidity < min_humidity OR humidity > max_humidity
Source: alert_configs.min_humidity, alert_configs.max_humidity
Comparison: qa_monitoring.humidity
```

### Critical Days Alerts
```
Trigger: day_of_incubation IN (critical_days array)
Source: alert_configs.critical_days (e.g., [7, 14, 18, 21])
Comparison: qa_monitoring.day_of_incubation
```

### Maintenance Alerts
```
Trigger: 
  - Hours: (current_time - last_maintenance) > maintenance_hours_interval
  - Days: (current_date - last_maintenance) > maintenance_days_interval
Source: alert_configs.maintenance_hours_interval, maintenance_days_interval
Comparison: machines.last_maintenance
```

### Schedule Reminder Alerts
```
Trigger: due_date <= current_date AND status = 'pending'
Source: residue_analysis_schedule.due_date
Type: Notifies when residue analysis is due or overdue
```

## Data Validation Rules

### Fertility Analysis Sample
```
Default Sample Size: 648 eggs
Minimum: No enforced minimum
Validation: fertile_eggs + infertile_eggs should = sample_size
```

### Residue Analysis Sample
```
Default Sample Size: 648 eggs
Validation: All categories should sum to sample_size
Categories: fertile, infertile, early_dead, mid_dead, late_dead, pipped, malformed, etc.
```

### Egg Pack Quality Sample
```
Default Sample Size: 100 eggs
Validation: grade_a + grade_b + grade_c + cracked + dirty + small + large = sample_size
```

## Notes

1. **Rounding**: Most percentages are rounded to whole numbers (0 decimal places)
2. **Null Handling**: Metrics exclude batches with null/missing data from averages
3. **Date Calculations**: All date differences use UTC to avoid timezone issues
4. **Capacity Limits**: Machine utilization can exceed 100% (over-capacity alert)
5. **Zero Division**: All formulas handle division by zero by returning 0 or N/A

---

*Last Updated: 2025-01-08*
*For code locations, see inline comments in respective files*
