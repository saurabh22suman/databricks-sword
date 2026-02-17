#!/usr/bin/env npx ts-node
/**
 * Generate realistic synthetic data for Field Operations missions.
 * Uses Faker to create industry-specific datasets.
 *
 * Run: pnpm tsx scripts/generate-field-ops-data.ts
 */

import { faker } from "@faker-js/faker"
import fs from "fs"
import path from "path"

const CONTENT_DIR = path.join(process.cwd(), "src/content/field-ops")

// Set seed for reproducibility
faker.seed(42)

// ============================================================================
// UTILITIES
// ============================================================================

function writeCSV(filePath: string, headers: string[], rows: string[][]): void {
  const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  console.log(`  ✓ ${path.basename(filePath)}: ${rows.length.toLocaleString()} rows`)
}

function writeJSON(filePath: string, data: object[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  // Write as JSON Lines for better streaming
  const content = data.map((d) => JSON.stringify(d)).join("\n")
  fs.writeFileSync(filePath, content)
  console.log(`  ✓ ${path.basename(filePath)}: ${data.length.toLocaleString()} rows`)
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

function formatTimestamp(d: Date): string {
  return d.toISOString()
}

function escapeCSV(val: string | number | null): string {
  if (val === null) return ""
  const str = String(val)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// ============================================================================
// RETAIL DATA (10K sales, 500 SKUs, 200 products)
// ============================================================================

function generateRetailData(): void {
  console.log("\n🛒 Generating RETAIL data...")
  const dataDir = path.join(CONTENT_DIR, "retail/data")

  // Products (200 items)
  const categories = ["Electronics", "Clothing", "Food", "Home", "Sports", "Beauty", "Toys", "Books"]
  const products: string[][] = []
  for (let i = 1; i <= 200; i++) {
    const sku = `SKU${String(i).padStart(5, "0")}`
    const name = faker.commerce.productName()
    const category = faker.helpers.arrayElement(categories)
    const price = faker.commerce.price({ min: 5, max: 500 })
    const cost = (parseFloat(price) * 0.6).toFixed(2)
    const supplier = faker.company.name()
    products.push([sku, escapeCSV(name), category, price, cost, escapeCSV(supplier)])
  }
  writeCSV(dataDir + "/products.csv", ["sku", "product_name", "category", "price", "cost", "supplier"], products)

  // Inventory levels (500 SKU-store combinations)
  const stores = ["STORE001", "STORE002", "STORE003", "STORE004", "STORE005"]
  const inventory: string[][] = []
  for (let i = 1; i <= 200; i++) {
    for (const store of stores.slice(0, Math.ceil(Math.random() * 5))) {
      const sku = `SKU${String(i).padStart(5, "0")}`
      const quantity = faker.number.int({ min: 0, max: 500 })
      const reorderPoint = faker.number.int({ min: 10, max: 50 })
      const lastRestocked = formatDate(randomDate(new Date("2025-01-01"), new Date("2026-02-01")))
      inventory.push([sku, store, String(quantity), String(reorderPoint), lastRestocked])
    }
  }
  writeCSV(
    dataDir + "/inventory_levels.csv",
    ["sku", "store_id", "quantity_on_hand", "reorder_point", "last_restocked"],
    inventory.slice(0, 500)
  )

  // Sales transactions (10K)
  const sales: string[][] = []
  const startDate = new Date("2025-06-01")
  const endDate = new Date("2026-02-15")
  for (let i = 1; i <= 10000; i++) {
    const txId = `TX${String(i).padStart(8, "0")}`
    const sku = `SKU${String(faker.number.int({ min: 1, max: 200 })).padStart(5, "0")}`
    const store = faker.helpers.arrayElement(stores)
    const quantity = faker.number.int({ min: 1, max: 10 })
    const unitPrice = faker.commerce.price({ min: 5, max: 500 })
    const totalAmount = (quantity * parseFloat(unitPrice)).toFixed(2)
    const txDate = formatTimestamp(randomDate(startDate, endDate))
    const customerId = `CUST${String(faker.number.int({ min: 1, max: 2000 })).padStart(6, "0")}`
    const paymentMethod = faker.helpers.arrayElement(["credit", "debit", "cash", "mobile"])
    sales.push([txId, sku, store, String(quantity), unitPrice, totalAmount, txDate, customerId, paymentMethod])
  }
  writeCSV(
    dataDir + "/sales_transactions.csv",
    ["transaction_id", "sku", "store_id", "quantity", "unit_price", "total_amount", "transaction_date", "customer_id", "payment_method"],
    sales
  )
}

// ============================================================================
// GAMING DATA (20K events, 2K players, 50 items)
// ============================================================================

function generateGamingData(): void {
  console.log("\n🎮 Generating GAMING data...")
  const dataDir = path.join(CONTENT_DIR, "gaming/data")

  // Players (2K)
  const players: string[][] = []
  for (let i = 1; i <= 2000; i++) {
    const playerId = `PLR${String(i).padStart(6, "0")}`
    const username = faker.internet.username()
    const email = faker.internet.email()
    const country = faker.location.countryCode()
    const registeredAt = formatTimestamp(randomDate(new Date("2024-01-01"), new Date("2026-01-15")))
    const level = faker.number.int({ min: 1, max: 100 })
    const totalSpent = faker.number.float({ min: 0, max: 500, fractionDigits: 2 })
    players.push([playerId, username, email, country, registeredAt, String(level), String(totalSpent)])
  }
  writeCSV(dataDir + "/players.csv", ["player_id", "username", "email", "country", "registered_at", "level", "total_spent"], players)

  // Game items (50)
  const itemTypes = ["weapon", "armor", "consumable", "cosmetic", "currency"]
  const rarities = ["common", "uncommon", "rare", "epic", "legendary"]
  const items: string[][] = []
  for (let i = 1; i <= 50; i++) {
    const itemId = `ITEM${String(i).padStart(4, "0")}`
    const name = faker.commerce.productName()
    const type = faker.helpers.arrayElement(itemTypes)
    const rarity = faker.helpers.arrayElement(rarities)
    const price = faker.number.int({ min: 10, max: 5000 })
    items.push([itemId, escapeCSV(name), type, rarity, String(price)])
  }
  writeCSV(dataDir + "/game_items.csv", ["item_id", "item_name", "item_type", "rarity", "price_gems"], items)

  // Player events (20K) - JSON Lines
  const eventTypes = ["login", "logout", "purchase", "level_up", "quest_complete", "pvp_match", "chat", "friend_add"]
  const events: object[] = []
  for (let i = 1; i <= 20000; i++) {
    const eventId = `EVT${String(i).padStart(8, "0")}`
    const playerId = `PLR${String(faker.number.int({ min: 1, max: 2000 })).padStart(6, "0")}`
    const eventType = faker.helpers.arrayElement(eventTypes)
    const timestamp = formatTimestamp(randomDate(new Date("2025-12-01"), new Date("2026-02-15")))
    const sessionId = `SES${faker.string.alphanumeric(8)}`
    
    const event: Record<string, unknown> = {
      event_id: eventId,
      player_id: playerId,
      event_type: eventType,
      timestamp,
      session_id: sessionId,
    }

    // Add event-specific data
    if (eventType === "purchase") {
      event.item_id = `ITEM${String(faker.number.int({ min: 1, max: 50 })).padStart(4, "0")}`
      event.amount = faker.number.int({ min: 10, max: 1000 })
    } else if (eventType === "level_up") {
      event.new_level = faker.number.int({ min: 2, max: 100 })
    } else if (eventType === "quest_complete") {
      event.quest_id = `QUEST${faker.number.int({ min: 1, max: 200 })}`
      event.xp_earned = faker.number.int({ min: 50, max: 500 })
    }

    events.push(event)
  }
  writeJSON(dataDir + "/player_events.json", events)
}

// ============================================================================
// HEALTHCARE DATA (5K EHR, 10K labs, 5K appointments, 5K claims)
// ============================================================================

function generateHealthcareData(): void {
  console.log("\n🏥 Generating HEALTHCARE data...")
  const dataDir = path.join(CONTENT_DIR, "healthcare/data")

  // Generate patient IDs first
  const patientIds = Array.from({ length: 3000 }, (_, i) => `PAT${String(i + 1).padStart(7, "0")}`)

  // EHR Records (5K) - JSON Lines
  const genders = ["M", "F", "O"]
  const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
  const ehrRecords: object[] = []
  for (let i = 1; i <= 5000; i++) {
    const recordId = `EHR${String(i).padStart(8, "0")}`
    const patientId = faker.helpers.arrayElement(patientIds)
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const dob = formatDate(randomDate(new Date("1940-01-01"), new Date("2010-01-01")))
    const ssn = `${faker.number.int({ min: 100, max: 999 })}-${faker.number.int({ min: 10, max: 99 })}-${faker.number.int({ min: 1000, max: 9999 })}`
    const gender = faker.helpers.arrayElement(genders)
    const bloodType = faker.helpers.arrayElement(bloodTypes)
    const address = faker.location.streetAddress()
    const city = faker.location.city()
    const state = faker.location.state({ abbreviated: true })
    const zip = faker.location.zipCode()
    const primaryDiagnosis = faker.helpers.arrayElement(["I10", "E11.9", "J06.9", "M54.5", "F32.9", "K21.0"])
    const admitDate = formatDate(randomDate(new Date("2025-01-01"), new Date("2026-02-01")))

    ehrRecords.push({
      record_id: recordId,
      patient_id: patientId,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dob,
      ssn,
      gender,
      blood_type: bloodType,
      address,
      city,
      state,
      zip_code: zip,
      primary_diagnosis: primaryDiagnosis,
      admit_date: admitDate,
    })
  }
  writeJSON(dataDir + "/ehr_records.json", ehrRecords)

  // Lab Results (10K)
  const labTests = ["CBC", "BMP", "CMP", "HbA1c", "TSH", "Lipid Panel", "UA", "PT/INR"]
  const labResults: string[][] = []
  for (let i = 1; i <= 10000; i++) {
    const resultId = `LAB${String(i).padStart(8, "0")}`
    const patientId = faker.helpers.arrayElement(patientIds)
    const testName = faker.helpers.arrayElement(labTests)
    const resultValue = faker.number.float({ min: 0.1, max: 500, fractionDigits: 2 })
    const unit = faker.helpers.arrayElement(["mg/dL", "mmol/L", "g/dL", "%", "mIU/L"])
    const refRangeLow = (resultValue * 0.7).toFixed(2)
    const refRangeHigh = (resultValue * 1.3).toFixed(2)
    const isAbnormal = Math.random() > 0.8 ? "Y" : "N"
    const collectedAt = formatTimestamp(randomDate(new Date("2025-06-01"), new Date("2026-02-15")))
    const orderedBy = `DR${faker.number.int({ min: 100, max: 500 })}`
    labResults.push([resultId, patientId, testName, String(resultValue), unit, refRangeLow, refRangeHigh, isAbnormal, collectedAt, orderedBy])
  }
  writeCSV(
    dataDir + "/lab_results.csv",
    ["result_id", "patient_id", "test_name", "result_value", "unit", "ref_range_low", "ref_range_high", "is_abnormal", "collected_at", "ordered_by"],
    labResults
  )

  // Appointments (5K)
  const appointmentTypes = ["routine_checkup", "follow_up", "specialist", "urgent", "procedure", "lab_work"]
  const statuses = ["scheduled", "completed", "cancelled", "no_show"]
  const appointments: string[][] = []
  for (let i = 1; i <= 5000; i++) {
    const apptId = `APPT${String(i).padStart(7, "0")}`
    const patientId = faker.helpers.arrayElement(patientIds)
    const providerId = `DR${faker.number.int({ min: 100, max: 500 })}`
    const apptType = faker.helpers.arrayElement(appointmentTypes)
    const scheduledAt = formatTimestamp(randomDate(new Date("2025-06-01"), new Date("2026-03-01")))
    const duration = faker.helpers.arrayElement([15, 30, 45, 60])
    const status = faker.helpers.arrayElement(statuses)
    const department = faker.helpers.arrayElement(["Internal Medicine", "Cardiology", "Orthopedics", "Dermatology", "Neurology"])
    appointments.push([apptId, patientId, providerId, apptType, scheduledAt, String(duration), status, department])
  }
  writeCSV(
    dataDir + "/appointments.csv",
    ["appointment_id", "patient_id", "provider_id", "appointment_type", "scheduled_at", "duration_minutes", "status", "department"],
    appointments
  )

  // Insurance Claims (5K)
  const claimStatuses = ["submitted", "processing", "approved", "denied", "paid"]
  const claims: string[][] = []
  for (let i = 1; i <= 5000; i++) {
    const claimId = `CLM${String(i).padStart(8, "0")}`
    const patientId = faker.helpers.arrayElement(patientIds)
    const providerId = `DR${faker.number.int({ min: 100, max: 500 })}`
    const serviceDate = formatDate(randomDate(new Date("2025-01-01"), new Date("2026-02-01")))
    const diagnosisCode = faker.helpers.arrayElement(["I10", "E11.9", "J06.9", "M54.5", "F32.9", "K21.0", "J18.9", "N39.0"])
    const procedureCode = faker.helpers.arrayElement(["99213", "99214", "99215", "99203", "99204", "36415", "85025"])
    const billedAmount = faker.number.float({ min: 50, max: 5000, fractionDigits: 2 })
    const allowedAmount = (billedAmount * 0.7).toFixed(2)
    const paidAmount = (parseFloat(allowedAmount) * 0.8).toFixed(2)
    const status = faker.helpers.arrayElement(claimStatuses)
    const insurerId = faker.helpers.arrayElement(["BCBS", "UHC", "Aetna", "Cigna", "Humana"])
    claims.push([claimId, patientId, providerId, serviceDate, diagnosisCode, procedureCode, String(billedAmount), allowedAmount, paidAmount, status, insurerId])
  }
  writeCSV(
    dataDir + "/insurance_claims.csv",
    ["claim_id", "patient_id", "provider_id", "service_date", "diagnosis_code", "procedure_code", "billed_amount", "allowed_amount", "paid_amount", "status", "insurer_id"],
    claims
  )

  // ICD-10 Reference Codes (100)
  const icdCodes: string[][] = [
    ["I10", "Essential hypertension", "Circulatory"],
    ["E11.9", "Type 2 diabetes mellitus without complications", "Endocrine"],
    ["J06.9", "Acute upper respiratory infection", "Respiratory"],
    ["M54.5", "Low back pain", "Musculoskeletal"],
    ["F32.9", "Major depressive disorder, single episode", "Mental"],
    ["K21.0", "Gastroesophageal reflux disease with esophagitis", "Digestive"],
    ["J18.9", "Pneumonia, unspecified organism", "Respiratory"],
    ["N39.0", "Urinary tract infection", "Genitourinary"],
    ["R10.9", "Unspecified abdominal pain", "Symptoms"],
    ["J45.909", "Unspecified asthma", "Respiratory"],
  ]
  writeCSV(dataDir + "/icd10_codes.csv", ["code", "description", "category"], icdCodes)

  // LOINC Reference Codes
  const loincCodes: string[][] = [
    ["2345-7", "Glucose [Mass/volume] in Serum or Plasma", "Chemistry"],
    ["4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", "Chemistry"],
    ["2093-3", "Cholesterol [Mass/volume] in Serum or Plasma", "Chemistry"],
    ["3094-0", "Urea nitrogen [Mass/volume] in Serum or Plasma", "Chemistry"],
    ["2160-0", "Creatinine [Mass/volume] in Serum or Plasma", "Chemistry"],
  ]
  writeCSV(dataDir + "/loinc_codes.csv", ["code", "description", "category"], loincCodes)
}

// ============================================================================
// FINTECH DATA (20K transactions, 2K accounts, 500 merchants)
// ============================================================================

function generateFintechData(): void {
  console.log("\n🏦 Generating FINTECH data...")
  const dataDir = path.join(CONTENT_DIR, "fintech/data")

  // Accounts (2K)
  const accountTypes = ["checking", "savings", "credit"]
  const accounts: string[][] = []
  for (let i = 1; i <= 2000; i++) {
    const accountId = `ACC${String(i).padStart(8, "0")}`
    const customerId = `CUST${String(faker.number.int({ min: 1, max: 1500 })).padStart(7, "0")}`
    const accountType = faker.helpers.arrayElement(accountTypes)
    const balance = faker.number.float({ min: -5000, max: 100000, fractionDigits: 2 })
    const creditLimit = accountType === "credit" ? faker.number.int({ min: 1000, max: 50000 }) : 0
    const openedAt = formatDate(randomDate(new Date("2020-01-01"), new Date("2025-12-01")))
    const status = faker.helpers.arrayElement(["active", "active", "active", "suspended", "closed"])
    const riskScore = faker.number.int({ min: 1, max: 100 })
    accounts.push([accountId, customerId, accountType, String(balance), String(creditLimit), openedAt, status, String(riskScore)])
  }
  writeCSV(
    dataDir + "/accounts.csv",
    ["account_id", "customer_id", "account_type", "balance", "credit_limit", "opened_at", "status", "risk_score"],
    accounts
  )

  // Merchants (500)
  const merchantCategories = ["retail", "food", "travel", "entertainment", "utilities", "healthcare", "gas", "online"]
  const riskLevels = ["low", "medium", "high"]
  const merchants: string[][] = []
  for (let i = 1; i <= 500; i++) {
    const merchantId = `MER${String(i).padStart(6, "0")}`
    const name = faker.company.name()
    const category = faker.helpers.arrayElement(merchantCategories)
    const city = faker.location.city()
    const country = faker.helpers.arrayElement(["USA", "USA", "USA", "CAN", "MEX", "GBR"])
    const mcc = faker.number.int({ min: 1000, max: 9999 })
    const riskLevel = faker.helpers.arrayElement(riskLevels)
    merchants.push([merchantId, escapeCSV(name), category, city, country, String(mcc), riskLevel])
  }
  writeCSV(dataDir + "/merchants.csv", ["merchant_id", "merchant_name", "category", "city", "country", "mcc_code", "risk_level"], merchants)

  // Transactions (20K) - JSON Lines
  const txTypes = ["purchase", "withdrawal", "transfer", "payment", "refund"]
  const channels = ["pos", "online", "atm", "mobile", "branch"]
  const transactions: object[] = []
  for (let i = 1; i <= 20000; i++) {
    const txId = `TXN${String(i).padStart(10, "0")}`
    const accountId = `ACC${String(faker.number.int({ min: 1, max: 2000 })).padStart(8, "0")}`
    const merchantId = `MER${String(faker.number.int({ min: 1, max: 500 })).padStart(6, "0")}`
    const txType = faker.helpers.arrayElement(txTypes)
    const amount = faker.number.float({ min: 1, max: 5000, fractionDigits: 2 })
    const currency = "USD"
    const timestamp = formatTimestamp(randomDate(new Date("2025-10-01"), new Date("2026-02-15")))
    const channel = faker.helpers.arrayElement(channels)
    const latitude = faker.location.latitude()
    const longitude = faker.location.longitude()
    const deviceId = `DEV${faker.string.alphanumeric(10)}`
    const ipAddress = faker.internet.ipv4()
    const status = faker.helpers.arrayElement(["approved", "approved", "approved", "declined", "pending"])

    transactions.push({
      transaction_id: txId,
      account_id: accountId,
      merchant_id: merchantId,
      transaction_type: txType,
      amount,
      currency,
      timestamp,
      channel,
      latitude,
      longitude,
      device_id: deviceId,
      ip_address: ipAddress,
      status,
    })
  }
  writeJSON(dataDir + "/transactions.json", transactions)

  // Fraud Labels (2K - labeled transactions for ML)
  const fraudLabels: string[][] = []
  for (let i = 1; i <= 2000; i++) {
    const txId = `TXN${String(faker.number.int({ min: 1, max: 20000 })).padStart(10, "0")}`
    // 5% fraud rate
    const isFraud = Math.random() < 0.05 ? "1" : "0"
    const fraudType = isFraud === "1" ? faker.helpers.arrayElement(["card_stolen", "account_takeover", "synthetic_id", "friendly_fraud"]) : ""
    const reportedAt = isFraud === "1" ? formatTimestamp(randomDate(new Date("2025-10-01"), new Date("2026-02-15"))) : ""
    fraudLabels.push([txId, isFraud, fraudType, reportedAt])
  }
  writeCSV(dataDir + "/fraud_labels.csv", ["transaction_id", "is_fraud", "fraud_type", "reported_at"], fraudLabels)
}

// ============================================================================
// AUTOMOTIVE DATA (50K telemetry, 1K vehicles)
// ============================================================================

function generateAutomotiveData(): void {
  console.log("\n🚗 Generating AUTOMOTIVE data...")
  const dataDir = path.join(CONTENT_DIR, "automotive/data")

  // Vehicles (1K)
  const makes = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Tesla", "Mercedes", "Audi"]
  const models: Record<string, string[]> = {
    Toyota: ["Camry", "Corolla", "RAV4", "Highlander"],
    Honda: ["Civic", "Accord", "CR-V", "Pilot"],
    Ford: ["F-150", "Mustang", "Explorer", "Escape"],
    Chevrolet: ["Silverado", "Malibu", "Equinox", "Tahoe"],
    BMW: ["3 Series", "5 Series", "X3", "X5"],
    Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
    Mercedes: ["C-Class", "E-Class", "GLC", "GLE"],
    Audi: ["A4", "A6", "Q5", "Q7"],
  }
  const vehicles: string[][] = []
  for (let i = 1; i <= 1000; i++) {
    const vehicleId = `VEH${String(i).padStart(6, "0")}`
    const vin = faker.vehicle.vin()
    const make = faker.helpers.arrayElement(makes)
    const model = faker.helpers.arrayElement(models[make])
    const year = faker.number.int({ min: 2018, max: 2026 })
    const odometer = faker.number.int({ min: 0, max: 150000 })
    const fuelType = faker.helpers.arrayElement(["gasoline", "diesel", "electric", "hybrid"])
    const ownerId = `OWN${String(faker.number.int({ min: 1, max: 800 })).padStart(6, "0")}`
    const registeredState = faker.location.state({ abbreviated: true })
    vehicles.push([vehicleId, vin, make, model, String(year), String(odometer), fuelType, ownerId, registeredState])
  }
  writeCSV(
    dataDir + "/vehicles.csv",
    ["vehicle_id", "vin", "make", "model", "year", "odometer", "fuel_type", "owner_id", "registered_state"],
    vehicles
  )

  // Vehicle Telemetry (50K) - JSON Lines
  const telemetry: object[] = []
  for (let i = 1; i <= 50000; i++) {
    const readingId = `TEL${String(i).padStart(8, "0")}`
    const vehicleId = `VEH${String(faker.number.int({ min: 1, max: 1000 })).padStart(6, "0")}`
    const timestamp = formatTimestamp(randomDate(new Date("2025-12-01"), new Date("2026-02-15")))
    
    // Sensor readings
    const engineRpm = faker.number.int({ min: 0, max: 8000 })
    const speed = faker.number.int({ min: 0, max: 140 })
    const throttlePosition = faker.number.float({ min: 0, max: 100, fractionDigits: 1 })
    const engineTemp = faker.number.int({ min: 150, max: 250 })
    const oilPressure = faker.number.int({ min: 20, max: 80 })
    const batteryVoltage = faker.number.float({ min: 11.5, max: 14.8, fractionDigits: 1 })
    const fuelLevel = faker.number.int({ min: 0, max: 100 })
    const tirePressure = {
      fl: faker.number.int({ min: 28, max: 36 }),
      fr: faker.number.int({ min: 28, max: 36 }),
      rl: faker.number.int({ min: 28, max: 36 }),
      rr: faker.number.int({ min: 28, max: 36 }),
    }
    const latitude = faker.location.latitude({ min: 25, max: 48 })
    const longitude = faker.location.longitude({ min: -125, max: -70 })

    telemetry.push({
      reading_id: readingId,
      vehicle_id: vehicleId,
      timestamp,
      engine_rpm: engineRpm,
      speed_mph: speed,
      throttle_position: throttlePosition,
      engine_temp_f: engineTemp,
      oil_pressure_psi: oilPressure,
      battery_voltage: batteryVoltage,
      fuel_level_pct: fuelLevel,
      tire_pressure_psi: tirePressure,
      latitude,
      longitude,
    })
  }
  writeJSON(dataDir + "/vehicle_telemetry.json", telemetry)

  // DTC Codes Reference
  const dtcCodes: string[][] = [
    ["P0300", "Random/Multiple Cylinder Misfire Detected", "engine", "high"],
    ["P0171", "System Too Lean (Bank 1)", "fuel", "medium"],
    ["P0420", "Catalyst System Efficiency Below Threshold", "emissions", "medium"],
    ["P0128", "Coolant Thermostat Temperature Below Regulating", "cooling", "low"],
    ["P0455", "Evaporative Emission System Leak Detected (large leak)", "emissions", "medium"],
    ["P0401", "Exhaust Gas Recirculation Flow Insufficient", "emissions", "medium"],
    ["P0442", "Evaporative Emission System Leak Detected (small leak)", "emissions", "low"],
    ["P0301", "Cylinder 1 Misfire Detected", "engine", "high"],
    ["P0500", "Vehicle Speed Sensor Malfunction", "transmission", "medium"],
    ["P0700", "Transmission Control System Malfunction", "transmission", "high"],
    ["C0035", "Left Front Wheel Speed Sensor Circuit", "abs", "high"],
    ["C0050", "Right Rear Wheel Speed Sensor Circuit", "abs", "high"],
    ["B0092", "Left Side Restraint Seat Position Sensor", "airbag", "high"],
    ["U0100", "Lost Communication With ECM/PCM", "network", "high"],
  ]
  writeCSV(dataDir + "/dtc_codes.csv", ["code", "description", "system", "severity"], dtcCodes)

  // Service Records (2K)
  const serviceTypes = ["oil_change", "tire_rotation", "brake_service", "transmission_service", "engine_diagnostic", "recall"]
  const serviceRecords: string[][] = []
  for (let i = 1; i <= 2000; i++) {
    const serviceId = `SVC${String(i).padStart(7, "0")}`
    const vehicleId = `VEH${String(faker.number.int({ min: 1, max: 1000 })).padStart(6, "0")}`
    const serviceDate = formatDate(randomDate(new Date("2024-01-01"), new Date("2026-02-01")))
    const serviceType = faker.helpers.arrayElement(serviceTypes)
    const odometer = faker.number.int({ min: 5000, max: 150000 })
    const cost = faker.number.float({ min: 50, max: 2000, fractionDigits: 2 })
    const technicianId = `TECH${faker.number.int({ min: 1, max: 50 })}`
    const notes = escapeCSV(faker.lorem.sentence())
    serviceRecords.push([serviceId, vehicleId, serviceDate, serviceType, String(odometer), String(cost), technicianId, notes])
  }
  writeCSV(
    dataDir + "/service_records.csv",
    ["service_id", "vehicle_id", "service_date", "service_type", "odometer", "cost", "technician_id", "notes"],
    serviceRecords
  )
}

// ============================================================================
// MANUFACTURING DATA (100K sensor readings, 2K batches, 2K inspections)
// ============================================================================

function generateManufacturingData(): void {
  console.log("\n🏭 Generating MANUFACTURING data...")
  const dataDir = path.join(CONTENT_DIR, "manufacturing/data")

  // Production Batches (2K)
  const productLines = ["Line-A", "Line-B", "Line-C", "Line-D"]
  const productTypes = ["Steel-Plate", "Steel-Coil", "Aluminum-Sheet", "Copper-Wire"]
  const batches: string[][] = []
  for (let i = 1; i <= 2000; i++) {
    const batchId = `BATCH${String(i).padStart(6, "0")}`
    const productLine = faker.helpers.arrayElement(productLines)
    const productType = faker.helpers.arrayElement(productTypes)
    const startTime = formatTimestamp(randomDate(new Date("2025-06-01"), new Date("2026-02-15")))
    const endTime = formatTimestamp(new Date(new Date(startTime).getTime() + faker.number.int({ min: 1, max: 8 }) * 3600000))
    const targetQty = faker.number.int({ min: 100, max: 1000 })
    const producedQty = Math.floor(targetQty * faker.number.float({ min: 0.9, max: 1.05 }))
    const defectQty = Math.floor(producedQty * faker.number.float({ min: 0.01, max: 0.1 }))
    batches.push([batchId, productLine, productType, startTime, endTime, String(targetQty), String(producedQty), String(defectQty)])
  }
  writeCSV(
    dataDir + "/production_batches.csv",
    ["batch_id", "product_line", "product_type", "start_time", "end_time", "target_qty", "produced_qty", "defect_qty"],
    batches
  )

  // Sensor Readings (100K) - JSON Lines
  const sensorTypes = ["temperature", "pressure", "vibration", "humidity", "flow_rate"]
  const sensorReadings: object[] = []
  for (let i = 1; i <= 100000; i++) {
    const readingId = `SENS${String(i).padStart(8, "0")}`
    const sensorId = `S${String(faker.number.int({ min: 1, max: 100 })).padStart(3, "0")}`
    const batchId = `BATCH${String(faker.number.int({ min: 1, max: 2000 })).padStart(6, "0")}`
    const sensorType = faker.helpers.arrayElement(sensorTypes)
    const timestamp = formatTimestamp(randomDate(new Date("2025-10-01"), new Date("2026-02-15")))
    
    let value: number
    let unit: string
    switch (sensorType) {
      case "temperature":
        value = faker.number.float({ min: 150, max: 500, fractionDigits: 1 })
        unit = "celsius"
        break
      case "pressure":
        value = faker.number.float({ min: 1, max: 20, fractionDigits: 2 })
        unit = "bar"
        break
      case "vibration":
        value = faker.number.float({ min: 0, max: 50, fractionDigits: 2 })
        unit = "mm/s"
        break
      case "humidity":
        value = faker.number.float({ min: 20, max: 80, fractionDigits: 1 })
        unit = "percent"
        break
      default:
        value = faker.number.float({ min: 10, max: 100, fractionDigits: 1 })
        unit = "l/min"
    }

    sensorReadings.push({
      reading_id: readingId,
      sensor_id: sensorId,
      batch_id: batchId,
      sensor_type: sensorType,
      timestamp,
      value,
      unit,
    })
  }
  writeJSON(dataDir + "/sensor_readings.json", sensorReadings)

  // Quality Inspections (2K)
  const defectTypes = ["surface_scratch", "dimensional_error", "coating_defect", "material_crack", "weld_defect", "none"]
  const inspections: string[][] = []
  for (let i = 1; i <= 2000; i++) {
    const inspectionId = `INS${String(i).padStart(7, "0")}`
    const batchId = `BATCH${String(faker.number.int({ min: 1, max: 2000 })).padStart(6, "0")}`
    const inspectorId = `QC${faker.number.int({ min: 1, max: 20 })}`
    const inspectionTime = formatTimestamp(randomDate(new Date("2025-06-01"), new Date("2026-02-15")))
    const sampleSize = faker.number.int({ min: 10, max: 50 })
    const defectsFound = faker.number.int({ min: 0, max: 5 })
    const defectType = defectsFound > 0 ? faker.helpers.arrayElement(defectTypes.slice(0, -1)) : "none"
    const passed = defectsFound < 3 ? "Y" : "N"
    inspections.push([inspectionId, batchId, inspectorId, inspectionTime, String(sampleSize), String(defectsFound), defectType, passed])
  }
  writeCSV(
    dataDir + "/quality_inspections.csv",
    ["inspection_id", "batch_id", "inspector_id", "inspection_time", "sample_size", "defects_found", "defect_type", "passed"],
    inspections
  )

  // Equipment Logs (3K)
  const equipment = ["CNC-001", "CNC-002", "PRESS-001", "PRESS-002", "FURNACE-001", "WELDER-001"]
  const eventTypes = ["startup", "shutdown", "maintenance", "alarm", "production"]
  const equipmentLogs: string[][] = []
  for (let i = 1; i <= 3000; i++) {
    const logId = `LOG${String(i).padStart(7, "0")}`
    const equipmentId = faker.helpers.arrayElement(equipment)
    const eventType = faker.helpers.arrayElement(eventTypes)
    const timestamp = formatTimestamp(randomDate(new Date("2025-10-01"), new Date("2026-02-15")))
    const operatorId = `OP${faker.number.int({ min: 1, max: 30 })}`
    const message = escapeCSV(faker.lorem.sentence())
    equipmentLogs.push([logId, equipmentId, eventType, timestamp, operatorId, message])
  }
  writeCSV(
    dataDir + "/equipment_logs.csv",
    ["log_id", "equipment_id", "event_type", "timestamp", "operator_id", "message"],
    equipmentLogs
  )
}

// ============================================================================
// TELECOM DATA (200K metrics, 10K complaints)
// ============================================================================

function generateTelecomData(): void {
  console.log("\n📡 Generating TELECOM data...")
  const dataDir = path.join(CONTENT_DIR, "telecom/data")

  // Network Topology (500 cell towers)
  const topology: string[][] = []
  for (let i = 1; i <= 500; i++) {
    const towerId = `TOWER${String(i).padStart(5, "0")}`
    const latitude = faker.location.latitude({ min: 25, max: 48 })
    const longitude = faker.location.longitude({ min: -125, max: -70 })
    const city = faker.location.city()
    const state = faker.location.state({ abbreviated: true })
    const towerType = faker.helpers.arrayElement(["macro", "micro", "small_cell", "distributed"])
    const technology = faker.helpers.arrayElement(["4G-LTE", "5G-NR", "4G-LTE", "5G-NR"])
    const capacity = faker.number.int({ min: 500, max: 5000 })
    const parentTower = i > 10 ? `TOWER${String(faker.number.int({ min: 1, max: i - 1 })).padStart(5, "0")}` : ""
    topology.push([towerId, String(latitude), String(longitude), city, state, towerType, technology, String(capacity), parentTower])
  }
  writeCSV(
    dataDir + "/network_topology.csv",
    ["tower_id", "latitude", "longitude", "city", "state", "tower_type", "technology", "capacity_mbps", "parent_tower_id"],
    topology
  )

  // Cell Tower Metrics (200K) - JSON Lines
  const metrics: object[] = []
  for (let i = 1; i <= 200000; i++) {
    const metricId = `MET${String(i).padStart(9, "0")}`
    const towerId = `TOWER${String(faker.number.int({ min: 1, max: 500 })).padStart(5, "0")}`
    const timestamp = formatTimestamp(randomDate(new Date("2025-12-01"), new Date("2026-02-15")))
    
    const activeConnections = faker.number.int({ min: 0, max: 2000 })
    const throughputMbps = faker.number.float({ min: 10, max: 500, fractionDigits: 1 })
    const latencyMs = faker.number.float({ min: 5, max: 200, fractionDigits: 1 })
    const packetLossPercent = faker.number.float({ min: 0, max: 5, fractionDigits: 2 })
    const signalStrengthDbm = faker.number.int({ min: -120, max: -50 })
    const cpuUsagePercent = faker.number.float({ min: 10, max: 95, fractionDigits: 1 })
    const memoryUsagePercent = faker.number.float({ min: 20, max: 90, fractionDigits: 1 })
    const temperature = faker.number.float({ min: 20, max: 75, fractionDigits: 1 })

    metrics.push({
      metric_id: metricId,
      tower_id: towerId,
      timestamp,
      active_connections: activeConnections,
      throughput_mbps: throughputMbps,
      latency_ms: latencyMs,
      packet_loss_percent: packetLossPercent,
      signal_strength_dbm: signalStrengthDbm,
      cpu_usage_percent: cpuUsagePercent,
      memory_usage_percent: memoryUsagePercent,
      temperature_celsius: temperature,
    })
  }
  writeJSON(dataDir + "/cell_tower_metrics.json", metrics)

  // Customer Complaints (10K)
  const complaintTypes = ["dropped_call", "slow_data", "no_signal", "billing_issue", "service_outage", "poor_voice_quality"]
  const priorities = ["low", "medium", "high", "critical"]
  const statuses = ["open", "investigating", "resolved", "closed"]
  const complaints: string[][] = []
  for (let i = 1; i <= 10000; i++) {
    const complaintId = `COMP${String(i).padStart(7, "0")}`
    const customerId = `CUST${String(faker.number.int({ min: 1, max: 50000 })).padStart(8, "0")}`
    const towerId = `TOWER${String(faker.number.int({ min: 1, max: 500 })).padStart(5, "0")}`
    const complaintType = faker.helpers.arrayElement(complaintTypes)
    const priority = faker.helpers.arrayElement(priorities)
    const status = faker.helpers.arrayElement(statuses)
    const createdAt = formatTimestamp(randomDate(new Date("2025-10-01"), new Date("2026-02-15")))
    const description = escapeCSV(faker.lorem.sentence())
    complaints.push([complaintId, customerId, towerId, complaintType, priority, status, createdAt, description])
  }
  writeCSV(
    dataDir + "/customer_complaints.csv",
    ["complaint_id", "customer_id", "tower_id", "complaint_type", "priority", "status", "created_at", "description"],
    complaints
  )

  // Weather Data (5K)
  const weatherConditions = ["clear", "cloudy", "rain", "snow", "fog", "storm"]
  const weather: string[][] = []
  for (let i = 1; i <= 5000; i++) {
    const recordId = `WX${String(i).padStart(6, "0")}`
    const towerId = `TOWER${String(faker.number.int({ min: 1, max: 500 })).padStart(5, "0")}`
    const timestamp = formatTimestamp(randomDate(new Date("2025-10-01"), new Date("2026-02-15")))
    const temperature = faker.number.float({ min: -10, max: 40, fractionDigits: 1 })
    const humidity = faker.number.int({ min: 20, max: 100 })
    const windSpeed = faker.number.float({ min: 0, max: 60, fractionDigits: 1 })
    const precipitation = faker.number.float({ min: 0, max: 50, fractionDigits: 1 })
    const condition = faker.helpers.arrayElement(weatherConditions)
    weather.push([recordId, towerId, timestamp, String(temperature), String(humidity), String(windSpeed), String(precipitation), condition])
  }
  writeCSV(
    dataDir + "/weather_data.csv",
    ["record_id", "tower_id", "timestamp", "temperature_c", "humidity_percent", "wind_speed_kmh", "precipitation_mm", "condition"],
    weather
  )
}

// ============================================================================
// AGRITECH DATA (50K soil sensors, satellite, weather)
// ============================================================================

function generateAgritechData(): void {
  console.log("\n🌾 Generating AGRITECH data...")
  const dataDir = path.join(CONTENT_DIR, "agritech/data")

  // Fields (200)
  const cropTypes = ["corn", "wheat", "soybeans", "cotton", "rice", "potatoes"]
  const fields: string[][] = []
  for (let i = 1; i <= 200; i++) {
    const fieldId = `FIELD${String(i).padStart(4, "0")}`
    const farmId = `FARM${String(faker.number.int({ min: 1, max: 30 })).padStart(3, "0")}`
    const acreage = faker.number.float({ min: 10, max: 500, fractionDigits: 1 })
    const cropType = faker.helpers.arrayElement(cropTypes)
    const soilType = faker.helpers.arrayElement(["clay", "sandy", "loam", "silt", "peat"])
    const latitude = faker.location.latitude({ min: 30, max: 45 })
    const longitude = faker.location.longitude({ min: -100, max: -80 })
    fields.push([fieldId, farmId, String(acreage), cropType, soilType, String(latitude), String(longitude)])
  }
  writeCSV(dataDir + "/fields.csv", ["field_id", "farm_id", "acreage", "crop_type", "soil_type", "latitude", "longitude"], fields)

  // Soil Sensors (50K) - JSON Lines
  const soilSensors: object[] = []
  for (let i = 1; i <= 50000; i++) {
    const readingId = `SOIL${String(i).padStart(8, "0")}`
    const sensorId = `SS${String(faker.number.int({ min: 1, max: 500 })).padStart(4, "0")}`
    const fieldId = `FIELD${String(faker.number.int({ min: 1, max: 200 })).padStart(4, "0")}`
    const timestamp = formatTimestamp(randomDate(new Date("2025-06-01"), new Date("2026-02-15")))
    const depth = faker.helpers.arrayElement([10, 20, 30, 50])
    
    soilSensors.push({
      reading_id: readingId,
      sensor_id: sensorId,
      field_id: fieldId,
      timestamp,
      depth_cm: depth,
      moisture_percent: faker.number.float({ min: 10, max: 60, fractionDigits: 1 }),
      temperature_c: faker.number.float({ min: 5, max: 35, fractionDigits: 1 }),
      ph_level: faker.number.float({ min: 5.5, max: 8.5, fractionDigits: 2 }),
      nitrogen_ppm: faker.number.int({ min: 10, max: 200 }),
      phosphorus_ppm: faker.number.int({ min: 5, max: 100 }),
      potassium_ppm: faker.number.int({ min: 50, max: 300 }),
      electrical_conductivity: faker.number.float({ min: 0.1, max: 4, fractionDigits: 2 }),
    })
  }
  writeJSON(dataDir + "/soil_sensors.json", soilSensors)

  // Satellite Imagery NDVI (10K)
  const satelliteData: string[][] = []
  for (let i = 1; i <= 10000; i++) {
    const imageId = `SAT${String(i).padStart(7, "0")}`
    const fieldId = `FIELD${String(faker.number.int({ min: 1, max: 200 })).padStart(4, "0")}`
    const captureDate = formatDate(randomDate(new Date("2025-03-01"), new Date("2026-02-15")))
    const ndvi = faker.number.float({ min: -0.1, max: 0.9, fractionDigits: 3 })
    const evi = faker.number.float({ min: -0.1, max: 0.8, fractionDigits: 3 })
    const lai = faker.number.float({ min: 0, max: 6, fractionDigits: 2 })
    const cloudCover = faker.number.int({ min: 0, max: 100 })
    const resolution = faker.helpers.arrayElement([10, 20, 30])
    satelliteData.push([imageId, fieldId, captureDate, String(ndvi), String(evi), String(lai), String(cloudCover), String(resolution)])
  }
  writeCSV(
    dataDir + "/satellite_imagery.csv",
    ["image_id", "field_id", "capture_date", "ndvi", "evi", "lai", "cloud_cover_percent", "resolution_m"],
    satelliteData
  )

  // Weather History (10K)
  const weatherHistory: string[][] = []
  for (let i = 1; i <= 10000; i++) {
    const recordId = `WH${String(i).padStart(7, "0")}`
    const fieldId = `FIELD${String(faker.number.int({ min: 1, max: 200 })).padStart(4, "0")}`
    const date = formatDate(randomDate(new Date("2025-01-01"), new Date("2026-02-15")))
    const tempMax = faker.number.float({ min: 10, max: 40, fractionDigits: 1 })
    const tempMin = faker.number.float({ min: -5, max: tempMax - 5, fractionDigits: 1 })
    const precipitation = faker.number.float({ min: 0, max: 50, fractionDigits: 1 })
    const humidity = faker.number.int({ min: 30, max: 95 })
    const windSpeed = faker.number.float({ min: 0, max: 40, fractionDigits: 1 })
    const solarRadiation = faker.number.int({ min: 50, max: 800 })
    weatherHistory.push([recordId, fieldId, date, String(tempMax), String(tempMin), String(precipitation), String(humidity), String(windSpeed), String(solarRadiation)])
  }
  writeCSV(
    dataDir + "/weather_history.csv",
    ["record_id", "field_id", "date", "temp_max_c", "temp_min_c", "precipitation_mm", "humidity_percent", "wind_speed_kmh", "solar_radiation_wm2"],
    weatherHistory
  )

  // Irrigation Logs (5K)
  const irrigationMethods = ["drip", "sprinkler", "flood", "center_pivot"]
  const irrigationLogs: string[][] = []
  for (let i = 1; i <= 5000; i++) {
    const logId = `IRR${String(i).padStart(6, "0")}`
    const fieldId = `FIELD${String(faker.number.int({ min: 1, max: 200 })).padStart(4, "0")}`
    const startTime = formatTimestamp(randomDate(new Date("2025-04-01"), new Date("2026-02-15")))
    const duration = faker.number.int({ min: 30, max: 480 })
    const waterUsed = faker.number.float({ min: 1000, max: 50000, fractionDigits: 0 })
    const method = faker.helpers.arrayElement(irrigationMethods)
    const scheduledVsManual = faker.helpers.arrayElement(["scheduled", "manual"])
    irrigationLogs.push([logId, fieldId, startTime, String(duration), String(waterUsed), method, scheduledVsManual])
  }
  writeCSV(
    dataDir + "/irrigation_logs.csv",
    ["log_id", "field_id", "start_time", "duration_minutes", "water_used_liters", "method", "trigger_type"],
    irrigationLogs
  )

  // Harvest Records (500)
  const harvestRecords: string[][] = []
  for (let i = 1; i <= 500; i++) {
    const harvestId = `HAR${String(i).padStart(5, "0")}`
    const fieldId = `FIELD${String(faker.number.int({ min: 1, max: 200 })).padStart(4, "0")}`
    const harvestDate = formatDate(randomDate(new Date("2025-09-01"), new Date("2026-01-15")))
    const yieldKgPerHa = faker.number.float({ min: 2000, max: 15000, fractionDigits: 0 })
    const qualityGrade = faker.helpers.arrayElement(["A", "A", "B", "B", "B", "C"])
    const moistureContent = faker.number.float({ min: 10, max: 25, fractionDigits: 1 })
    const laborHours = faker.number.int({ min: 4, max: 48 })
    harvestRecords.push([harvestId, fieldId, harvestDate, String(yieldKgPerHa), qualityGrade, String(moistureContent), String(laborHours)])
  }
  writeCSV(
    dataDir + "/harvest_records.csv",
    ["harvest_id", "field_id", "harvest_date", "yield_kg_per_ha", "quality_grade", "moisture_content_percent", "labor_hours"],
    harvestRecords
  )
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log("🚀 Generating Field Operations synthetic data...")
  console.log("   Using @faker-js/faker with seed 42 for reproducibility")
  console.log("=" .repeat(60))

  generateRetailData()
  generateGamingData()
  generateHealthcareData()
  generateFintechData()
  generateAutomotiveData()
  generateManufacturingData()
  generateTelecomData()
  generateAgritechData()

  console.log("\n" + "=".repeat(60))
  console.log("✅ All data generated successfully!")
  console.log("\nFile sizes:")
  
  // Show file sizes
  const { execSync } = await import("child_process")
  console.log(execSync("du -sh src/content/field-ops/*/data/").toString())
}

main().catch(console.error)
