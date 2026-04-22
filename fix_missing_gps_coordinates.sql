-- ============================================================
-- SunoSeva — Fix Missing GPS Coordinates
-- Assigns realistic dummy Indian city coordinates to all
-- complaints that currently have NULL latitude/longitude.
--
-- STEP 1: Preview which complaints will be updated
-- ============================================================
SELECT
  id,
  category,
  status,
  LEFT(text, 60) AS preview,
  created_at
FROM complaints
WHERE latitude IS NULL OR longitude IS NULL
ORDER BY created_at DESC;


-- ============================================================
-- STEP 2: Run the UPDATE
-- Each complaint gets routed to one of 20 major Indian cities
-- based on its creation timestamp (rotates evenly).
-- A small ±0.03° random offset (~3km) is added so markers
-- don't pile exactly on the same pixel.
-- ============================================================
UPDATE complaints
SET
  latitude = CASE (EXTRACT(EPOCH FROM created_at)::bigint % 20)
    WHEN 0  THEN 26.8467 + (random() * 0.06 - 0.03)   -- Lucknow
    WHEN 1  THEN 28.6139 + (random() * 0.06 - 0.03)   -- New Delhi
    WHEN 2  THEN 19.0760 + (random() * 0.06 - 0.03)   -- Mumbai
    WHEN 3  THEN 22.5726 + (random() * 0.06 - 0.03)   -- Kolkata
    WHEN 4  THEN 13.0827 + (random() * 0.06 - 0.03)   -- Chennai
    WHEN 5  THEN 12.9716 + (random() * 0.06 - 0.03)   -- Bangalore
    WHEN 6  THEN 17.3850 + (random() * 0.06 - 0.03)   -- Hyderabad
    WHEN 7  THEN 18.5204 + (random() * 0.06 - 0.03)   -- Pune
    WHEN 8  THEN 23.0225 + (random() * 0.06 - 0.03)   -- Ahmedabad
    WHEN 9  THEN 26.9124 + (random() * 0.06 - 0.03)   -- Jaipur
    WHEN 10 THEN 21.1702 + (random() * 0.06 - 0.03)   -- Surat
    WHEN 11 THEN 25.5941 + (random() * 0.06 - 0.03)   -- Patna
    WHEN 12 THEN 23.2599 + (random() * 0.06 - 0.03)   -- Bhopal
    WHEN 13 THEN 30.7333 + (random() * 0.06 - 0.03)   -- Chandigarh
    WHEN 14 THEN 21.1458 + (random() * 0.06 - 0.03)   -- Nagpur
    WHEN 15 THEN 22.7196 + (random() * 0.06 - 0.03)   -- Indore
    WHEN 16 THEN 17.6868 + (random() * 0.06 - 0.03)   -- Visakhapatnam
    WHEN 17 THEN 26.4499 + (random() * 0.06 - 0.03)   -- Kanpur
    WHEN 18 THEN 25.3176 + (random() * 0.06 - 0.03)   -- Varanasi
    WHEN 19 THEN 26.8505 + (random() * 0.06 - 0.03)   -- Lucknow (Hazratganj)
    ELSE         26.8467 + (random() * 0.06 - 0.03)   -- fallback: Lucknow
  END,

  longitude = CASE (EXTRACT(EPOCH FROM created_at)::bigint % 20)
    WHEN 0  THEN 80.9462 + (random() * 0.06 - 0.03)   -- Lucknow
    WHEN 1  THEN 77.2090 + (random() * 0.06 - 0.03)   -- New Delhi
    WHEN 2  THEN 72.8777 + (random() * 0.06 - 0.03)   -- Mumbai
    WHEN 3  THEN 88.3639 + (random() * 0.06 - 0.03)   -- Kolkata
    WHEN 4  THEN 80.2707 + (random() * 0.06 - 0.03)   -- Chennai
    WHEN 5  THEN 77.5946 + (random() * 0.06 - 0.03)   -- Bangalore
    WHEN 6  THEN 78.4867 + (random() * 0.06 - 0.03)   -- Hyderabad
    WHEN 7  THEN 73.8567 + (random() * 0.06 - 0.03)   -- Pune
    WHEN 8  THEN 72.5714 + (random() * 0.06 - 0.03)   -- Ahmedabad
    WHEN 9  THEN 75.7873 + (random() * 0.06 - 0.03)   -- Jaipur
    WHEN 10 THEN 72.8311 + (random() * 0.06 - 0.03)   -- Surat
    WHEN 11 THEN 85.1376 + (random() * 0.06 - 0.03)   -- Patna
    WHEN 12 THEN 77.4126 + (random() * 0.06 - 0.03)   -- Bhopal
    WHEN 13 THEN 76.7794 + (random() * 0.06 - 0.03)   -- Chandigarh
    WHEN 14 THEN 79.0882 + (random() * 0.06 - 0.03)   -- Nagpur
    WHEN 15 THEN 75.8577 + (random() * 0.06 - 0.03)   -- Indore
    WHEN 16 THEN 83.2185 + (random() * 0.06 - 0.03)   -- Visakhapatnam
    WHEN 17 THEN 80.3319 + (random() * 0.06 - 0.03)   -- Kanpur
    WHEN 18 THEN 82.9739 + (random() * 0.06 - 0.03)   -- Varanasi
    WHEN 19 THEN 80.9399 + (random() * 0.06 - 0.03)   -- Lucknow (Charbagh)
    ELSE         80.9462 + (random() * 0.06 - 0.03)   -- fallback: Lucknow
  END

WHERE latitude IS NULL OR longitude IS NULL;


-- ============================================================
-- STEP 3: Verify — should return 0 rows after update
-- ============================================================
SELECT COUNT(*) AS still_missing
FROM complaints
WHERE latitude IS NULL OR longitude IS NULL;


-- ============================================================
-- STEP 4: Spot-check — see a sample of what was just set
-- ============================================================
SELECT
  id,
  category,
  status,
  ROUND(latitude::numeric, 4)  AS lat,
  ROUND(longitude::numeric, 4) AS lng
FROM complaints
ORDER BY created_at DESC
LIMIT 20;
