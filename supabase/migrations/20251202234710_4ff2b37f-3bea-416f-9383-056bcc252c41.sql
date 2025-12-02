-- Update setter machine capacities to 210,000 for realistic utilization
UPDATE machines 
SET capacity = 210000 
WHERE machine_type = 'setter';

-- Update hatcher machine capacities to 360,000 for realistic utilization
UPDATE machines 
SET capacity = 360000 
WHERE machine_type = 'hatcher';