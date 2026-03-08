#!/usr/bin/env npx tsx
/**
 * Seeds the first large raw strain dataset for the canonical master list pipeline.
 * Outputs raw_imported_names.json to TheVault/master_list/ with ~1500 entries including duplicates/variants.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT_ROOT =
  process.env.VAULT_ROOT ??
  (existsSync("/Volumes/TheVault/strainspotter-vault")
    ? "/Volumes/TheVault/strainspotter-vault"
    : join(__dirname, "../../vault-output"));

const RAW_STRAINS: string[] = [
  // Blue Dream variants
  "Blue Dream", "blue dream", "Blue-Dream", "BlueDream", "Blue dream",
  // OG Kush variants
  "OG Kush", "OG-Kush", "Og kush", "og kush", "OGKush", "O.G. Kush",
  // Northern Lights
  "Northern Lights", "Northern-Lights", "NorthernLights", "northern lights",
  // GSC / Girl Scout Cookies
  "GSC", "Girl Scout Cookies", "GirlScoutCookies", "Girl Scout Cookies", "girl scout cookies",
  // White Widow
  "White Widow", "White-Widow", "WhiteWidow", "white widow",
  // Sour Diesel
  "Sour Diesel", "Sour-Diesel", "SourDiesel", "sour diesel", "SD",
  // Super Silver Haze
  "Super Silver Haze", "Super-Silver-Haze", "Super Silver Haze", "SSH",
  // Granddaddy Purple / GDP
  "Granddaddy Purple", "Granddaddy-Purple", "GDP", "Grand Daddy Purple",
  // Gelato
  "Gelato", "Gelato 33", "Gelato #33", "Gelato-33", "Gelato33",
  // Runtz family
  "Runtz", "Pink Runtz", "Pink-Runtz", "White Runtz", "White-Runtz", "runtz",
  // Wedding Cake
  "Wedding Cake", "Wedding-Cake", "WeddingCake", "wedding cake",
  // Triangle Kush
  "Triangle Kush", "Triangle-Kush", "TriangleKush",
  // Purple Punch
  "Purple Punch", "Purple-Punch", "PurplePunch", "purple punch",
  // Do-Si-Dos
  "Do-Si-Dos", "Do Si Dos", "Dosidos", "Do-Si-Do",
  // Biscotti
  "Biscotti", "biscotti",
  // Zkittlez / Zkittles / Skittlez
  "Zkittlez", "Zkittles", "Skittlez", "zkittlez", "Zkittlez",
  // Skunk
  "Skunk #1", "Skunk 1", "Skunk #1", "skunk 1", "Skunk",
  // AK-47
  "AK-47", "AK47", "AK 47", "ak47", "Ak-47",
  // Jack Herer
  "Jack Herer", "Jack-Herer", "JackHerer", "jack herer",
  // Durban Poison
  "Durban Poison", "Durban-Poison", "DurbanPoison", "durban poison",
  // Gorilla Glue
  "Gorilla Glue", "Gorilla Glue #4", "GG4", "Gorilla-Glue", "Gorilla Glue 4",
  // Bruce Banner
  "Bruce Banner", "Bruce-Banner", "BruceBanner", "bruce banner",
  // MAC
  "MAC", "MAC 1", "MAC-1", "Mac 1", "mac1",
  // Mendo Breath
  "Mendo Breath", "Mendo-Breath", "MendoBreath",
  // Pineapple Express
  "Pineapple Express", "Pineapple-Express", "PineappleExpress", "pineapple express",
  // Green Crack
  "Green Crack", "Green-Crack", "GreenCrack", "green crack", "Cush",
  // Trainwreck
  "Trainwreck", "Train Wreck", "Train-Wreck", "trainwreck",
  // Strawberry Cough
  "Strawberry Cough", "Strawberry-Cough", "StrawberryCough",
  // Cherry Pie
  "Cherry Pie", "Cherry-Pie", "CherryPie", "cherry pie",
  // Banana Kush
  "Banana Kush", "Banana-Kush", "BananaKush",
  // Lemon Haze
  "Lemon Haze", "Lemon-Haze", "LemonHaze", "Super Lemon Haze",
  // Amnesia Haze
  "Amnesia Haze", "Amnesia-Haze", "AmnesiaHaze", "amnesia haze",
  // Tangie
  "Tangie", "Tangerine Dream", "Tangerine-Dream",
  // Grape Ape
  "Grape Ape", "Grape-Ape", "GrapeApe", "grape ape",
  // Bubba Kush
  "Bubba Kush", "Bubba-Kush", "BubbaKush", "bubba kush",
  // Chemdawg
  "Chemdawg", "Chemdawg", "Chem Dawg", "Chem-Dawg", "Chemdog",
  // Ghost OG
  "Ghost OG", "Ghost-OG", "GhostOG", "Ghost Og",
  // Skywalker OG
  "Skywalker OG", "Skywalker-OG", "SkywalkerOG",
  // Purple Haze
  "Purple Haze", "Purple-Haze", "PurpleHaze", "purple haze",
  // Dutch Treat
  "Dutch Treat", "Dutch-Treat", "DutchTreat",
  // Blueberry
  "Blueberry", "Blue Berry", "Blue-Berry",
  // Blackberry Kush
  "Blackberry Kush", "Blackberry-Kush", "BlackberryKush",
  // White Rhino
  "White Rhino", "White-Rhino", "WhiteRhino",
  // Candyland
  "Candyland", "Candy Land", "Candy-Land",
  // Gelato 41, 42, etc
  "Gelato 41", "Gelato 42", "Gelato-41", "Gelato-42",
  // Sherbet
  "Sunset Sherbet", "Sunset-Sherbet", "SunsetSherbet", "Sherbet",
  // Cookies crosses
  "Thin Mint Cookies", "Thin-Mint-Cookies", "Animal Cookies", "Animal-Cookies",
  "Platinum Cookies", "Platinum-Cookies", "Forum Cut Cookies",
  // Gary Payton
  "Gary Payton", "Gary-Payton", "GaryPayton", "gary payton",
  // Zoap
  "Zoap", "ZOAP", "zoap",
  // Apples and Bananas
  "Apples and Bananas", "Apples & Bananas", "Apples-and-Bananas",
  // Runtz variants
  "Apple Runtz", "Grape Runtz", "Strawberry Runtz", "Watermelon Runtz",
  // Kush family
  "Master Kush", "Master-Kush", "Hindu Kush", "Hindu-Kush", "Purple Kush",
  "Lavender Kush", "Platinum Kush", "Critical Kush", "Kosher Kush",
  "Obama Kush", "Pre-98 Bubba", "Pre 98 Bubba",
  // Haze family
  "Neville's Haze", "Nevilles Haze", "Purple Haze", "Lemon Haze",
  "Strawberry Haze", "Pineapple Haze", "Mango Haze", "Silver Haze",
  // Diesel family
  "NYC Diesel", "NYC-Diesel", "Sour Diesel", "Sensi Star",
  // Cheese
  "Cheese", "UK Cheese", "Blue Cheese", "Blue-Cheese",
  // Kush Mints
  "Kush Mints", "Kush-Mints", "KushMints",
  // Ice Cream Cake
  "Ice Cream Cake", "Ice-Cream-Cake", "IceCreamCake", "ICC",
  // Oreoz
  "Oreoz", "Oreo", "Oreo Cookies", "OreoZ",
  // Jealousy
  "Jealousy", "Jealousy BX", "Jealousy BX1",
  // GMO
  "GMO", "GMO Cookies", "GMO-Cookies", "Garlic Cookies",
  // Runtz x Gelato crosses
  "Runtz Muffin", "Runtz Sorbet",
  // Mimosa
  "Mimosa", "Mimosa Evo", "Mimosa-Evo",
  // Clementine
  "Clementine", "Clementine Kush",
  // Tropicana
  "Tropicana Cookies", "Tropicana-Cookies", "Tropicana",
  // Papaya
  "Papaya", "Papaya Cake", "Papaya-Cake",
  // Moonbow
  "Moonbow", "Moonbow 112", "Moonbow-112",
  // Donny Burger
  "Donny Burger", "Donny-Burger", "DonnyBurger",
  // Blue Cookies
  "Blue Cookies", "Blue-Cookies", "BlueCookies",
  // LA Confidential
  "LA Confidential", "LA-Confidential", "L.A. Confidential",
  // Alaskan Thunder
  "Alaskan Thunder Fuck", "ATF", "Alaskan Thunder",
  // Acapulco Gold
  "Acapulco Gold", "Acapulco-Gold", "AcapulcoGold",
  // Panama Red
  "Panama Red", "Panama-Red", "PanamaRed",
  // Lamb's Bread
  "Lamb's Bread", "Lambs Bread", "Lambsbread",
  // Chocolate Thai
  "Chocolate Thai", "Chocolate-Thai",
  // Columbian Gold
  "Columbian Gold", "Colombian Gold", "Columbian-Gold",
  // Maui Wowie
  "Maui Wowie", "Maui-Wowie", "MauiWowie", "Maui Waui",
  // Hawaiian
  "Hawaiian", "Hawaiian Snow", "Hawaiian-Snow", "Hawaiian Haze",
  // Malawi Gold
  "Malawi Gold", "Malawi-Gold", "MalawiGold",
  // Durban
  "Durban Poison", "Durban", "Durban Thai",
  // Afghani
  "Afghani", "Afghan", "Afghan Kush", "Afghan-Kush",
  // Hindu
  "Hindu Kush", "Hindu-Kush", "Hindu Kush",
  // Thai
  "Thai", "Thai Stick", "Thai-Stick", "Original Thai",
  // Jamaican
  "Jamaican", "Jamaican Pearl", "Jamaican Dream",
  // Mexican
  "Mexican", "Mexican Sativa", "Mexican Brick",
  // Laughing Buddha
  "Laughing Buddha", "Laughing-Buddha", "LaughingBuddha",
  // Chocolope
  "Chocolope", "Chocolate Diesel", "Chocolate-Diesel",
  // Cannatonic
  "Cannatonic", "Canna-Tonic", "CannaTonic",
  // Harlequin
  "Harlequin", "Harle-Tsu", "Harlequin Tsu",
  // Charlotte's Web
  "Charlotte's Web", "Charlottes Web", "Charlottes-Web",
  // ACDC
  "ACDC", "AC/DC", "AC DC", "acdc",
  // Ringo's Gift
  "Ringo's Gift", "Ringos Gift", "Ringo Gift",
  // Sour Tsunami
  "Sour Tsunami", "Sour-Tsunami", "SourTsunami",
  // Pennywise
  "Pennywise", "Penny Wise", "Penny-Wise",
  // Canna-Tsu
  "Canna-Tsu", "CannaTsu", "Canna Tsu",
  // Critical Mass
  "Critical Mass", "Critical-Mass", "CriticalMass",
  // Big Bud
  "Big Bud", "Big-Bud", "BigBud", "Big Bud",
  // White Russian
  "White Russian", "White-Russian", "WhiteRussian",
  // Critical +
  "Critical +", "Critical Plus", "Critical+",
  // Power Plant
  "Power Plant", "Power-Plant", "PowerPlant",
  // White Widow x Big Bud
  "Black Widow", "Black-Widow", "BlackWidow",
  // Sensi Star
  "Sensi Star", "Sensi-Star", "SensiStar",
  // Shiva Skunk
  "Shiva Skunk", "Shiva-Skunk", "ShivaSkunk",
  // Super Skunk
  "Super Skunk", "Super-Skunk", "SuperSkunk",
  // Chronic
  "Chronic", "The Chronic", "Chronic 2000",
  // Aurora Indica
  "Aurora Indica", "Aurora-Indica", "AuroraIndica",
  // Black Domina
  "Black Domina", "Black-Domina", "BlackDomina",
  // Hash Plant
  "Hash Plant", "Hash-Plant", "HashPlant",
  // Afgoo
  "Afgoo", "Afgooey", "Afgooey",
  // Afghani Bullrider
  "Afghani Bullrider", "Afghani-Bullrider", "Bullrider",
  // Mango
  "Mango", "Mango Kush", "Mango-Kush", "Mango Haze",
  // Grapefruit
  "Grapefruit", "Grape Fruit", "Grape-Fruit",
  // Cinderella 99
  "Cinderella 99", "C99", "Cinderella 99", "Cindy 99",
  // Apollo 11
  "Apollo 11", "Apollo-11", "Apollo11", "Apollo Eleven",
  // Space Queen
  "Space Queen", "Space-Queen", "SpaceQueen",
  // Vortex
  "Vortex", "Vortex OG",
  // Jillybean
  "Jillybean", "Jilly Bean", "Jilly-Bean",
  // Agent Orange
  "Agent Orange", "Agent-Orange", "AgentOrange",
  // Querkle
  "Querkle", "Querkle Kush",
  // Purple Urkle
  "Purple Urkle", "Purple-Urkle", "PurpleUrkle", "Urkle",
  // Tangerine Dream
  "Tangerine Dream", "Tangerine-Dream", "TangerineDream",
  // Lemon Skunk
  "Lemon Skunk", "Lemon-Skunk", "LemonSkunk",
  // Chocolope
  "Chocolope", "Choco Lope", "Choco-Lope",
  // S.A.G.E.
  "S.A.G.E.", "SAGE", "Sage", "Sage N Sour",
  // Vortex
  "Vortex", "Vortex OG",
  // Laughing Buddha
  "Laughing Buddha", "Laughing-Buddha",
  // J1
  "J1", "J-1", "J 1", "Jack One",
  // Green Queen
  "Green Queen", "Green-Queen", "GreenQueen",
  // Chocolate Chunk
  "Chocolate Chunk", "Chocolate-Chunk", "ChocolateChunk",
  // White Fire OG
  "White Fire OG", "WiFi OG", "Wifi OG", "Wifi",
  // Fire OG
  "Fire OG", "Fire-OG", "FireOG", "Fire OG Kush",
  // Tahoe OG
  "Tahoe OG", "Tahoe-OG", "TahoeOG", "Tahoe",
  // SFV OG
  "SFV OG", "SFV-OG", "SFVOG", "San Fernando Valley OG",
  // Louie XIII
  "Louie XIII", "Louie 13", "Louis XIII", "Louis 13",
  // Larry OG
  "Larry OG", "Larry-OG", "LarryOG",
  // Headband
  "Headband", "Headband OG", "Headband-OG", "OG Headband",
  // Sour OG
  "Sour OG", "Sour-OG", "SourOG",
  // Blueberry Headband
  "Blueberry Headband", "Blueberry-Headband",
  // Pre-98 Bubba
  "Pre-98 Bubba Kush", "Pre 98 Bubba", "Pre98 Bubba",
  // Legend OG
  "Legend OG", "Legend-OG", "LegendOG",
  // Alpha OG
  "Alpha OG", "Alpha-OG",
  // Cherry Limeade
  "Cherry Limeade", "Cherry-Limeade", "CherryLimeade",
  // Clementine
  "Clementine", "Clementine Kush", "Clementine-Kush",
  // Lemon Tree
  "Lemon Tree", "Lemon-Tree", "LemonTree",
  // Lemon OG
  "Lemon OG", "Lemon-OG", "LemonOG",
  // Lemon Meringue
  "Lemon Meringue", "Lemon-Meringue",
  // Orange Cookies
  "Orange Cookies", "Orange-Cookies", "OrangeCookies",
  // Orange Cream
  "Orange Cream", "Orange-Cream", "OrangeCream",
  // Tangie
  "Tangie", "Tangie Dream", "Tangie-Dream",
  // Mandarin Cookies
  "Mandarin Cookies", "Mandarin-Cookies", "MandarinCookies",
  // Mandarin Sunset
  "Mandarin Sunset", "Mandarin-Sunset",
  // Mandarin Dreams
  "Mandarin Dreams", "Mandarin-Dreams",
  // Mandarin Zkittlez
  "Mandarin Zkittlez", "Mandarin-Zkittlez",
  // Rainbow Belt
  "Rainbow Belt", "Rainbow-Belt", "RainbowBelt",
  // Rainbow Chip
  "Rainbow Chip", "Rainbow-Chip",
  // Cereal Milk
  "Cereal Milk", "Cereal-Milk", "CerealMilk",
  // Sherbacio
  "Sherbacio", "Sherbacio",
  // Sherblato
  "Sherblato", "Sherblato",
  // Runtz OG
  "Runtz OG", "Runtz-OG", "RuntzOG",
  // Runtz Cake
  "Runtz Cake", "Runtz-Cake",
  // Gelato Cake
  "Gelato Cake", "Gelato-Cake",
  // Gelato Mint
  "Gelato Mint", "Gelato-Mint",
  // Mint Chocolate Chip
  "Mint Chocolate Chip", "Mint-Chocolate-Chip",
  // Kush Cream
  "Kush Cream", "Kush-Cream",
  // Lemonade
  "Lemonade", "London Lemonade", "LA Lemonade",
  // Melonatta
  "Melonatta", "Melonatta",
  // Apple Fritter
  "Apple Fritter", "Apple-Fritter", "AppleFritter",
  // Blueberry Muffin
  "Blueberry Muffin", "Blueberry-Muffin",
  // Pound Cake
  "Pound Cake", "Pound-Cake",
  // Birthday Cake
  "Birthday Cake", "Birthday-Cake",
  // Gelato 45
  "Gelato 45", "Gelato-45",
  // Gelato 47
  "Gelato 47", "Gelato-47",
  // Gelato 49
  "Gelato 49", "Gelato-49",
  // Biscotti x Gelato
  "Biscoff", "Biscoff",
  // Biscotti Sherbet
  "Biscotti Sherbet", "Biscotti-Sherbet",
  // Peanut Butter Breath
  "Peanut Butter Breath", "PB Breath", "PBB",
  // Meat Breath
  "Meat Breath", "Meat-Breath",
  // Mendo Breath
  "Mendo Breath", "Mendo-Breath",
  // Zkittlez x OG
  "Zkittlez OG", "Zkittlez-OG",
  // RS11
  "RS11", "RS 11", "RS-11", "RS Eleven",
  // Permanent Marker
  "Permanent Marker", "Permanent-Marker",
  // Gas Face
  "Gas Face", "Gas-Face",
  // Cookies and Cream
  "Cookies and Cream", "Cookies & Cream", "Cookies N Cream",
  // Milk and Cookies
  "Milk and Cookies", "Milk & Cookies",
  // Candy Kush
  "Candy Kush", "Candy-Kush",
  // Cotton Candy
  "Cotton Candy", "Cotton-Candy",
  // Candyland
  "Candyland", "Candy Land",
  // Grape Stomper
  "Grape Stomper", "Grape-Stomper", "GrapeStomper",
  // Grape God
  "Grape God", "Grape-God",
  // Granddaddy Purp
  "Granddaddy Purp", "Granddaddy-Purp", "GDP",
  // Grand Daddy Purp
  "Grand Daddy Purp", "Grand-Daddy-Purp",
  // Purple Urkle
  "Purple Urkle", "Purple-Urkle",
  // Purple Kush
  "Purple Kush", "Purple-Kush", "PurpleKush",
  // Purple Punch
  "Purple Punch", "Purple-Punch",
  // Purple Trainwreck
  "Purple Trainwreck", "Purple-Trainwreck",
  // Purple Monkey
  "Purple Monkey", "Purple-Monkey",
  // Purple Elephant
  "Purple Elephant", "Purple-Elephant",
  // Purple Drank
  "Purple Drank", "Purple-Drank",
  // Purple Diesel
  "Purple Diesel", "Purple-Diesel",
  // Purple Afghan
  "Purple Afghan", "Purple-Afghan",
  // Purple Urkle
  "Urkle", "Urkle",
  // Mendocino Purps
  "Mendocino Purps", "Mendo Purps",
  // Velvet Purple
  "Velvet Purple", "Velvet-Purple",
  // Agent Orange
  "Agent Orange", "Agent-Orange",
  // Clementine
  "Clementine", "Clementine",
  // Orange Crush
  "Orange Crush", "Orange-Crush",
  // Tangerine Power
  "Tangerine Power", "Tangerine-Power",
  // California Orange
  "California Orange", "California-Orange",
  // Blueberry Headband
  "Blueberry Headband",
  // Blue Cheese
  "Blue Cheese", "Blue-Cheese",
  // Blue Cookies
  "Blue Cookies",
  // Blue Tahoe
  "Blue Tahoe", "Blue-Tahoe",
  // Blue Zkittlez
  "Blue Zkittlez", "Blue-Zkittlez",
  // Blue Fire
  "Blue Fire", "Blue-Fire",
  // Blue City Diesel
  "Blue City Diesel", "Blue-City-Diesel",
  // Blue Magoo
  "Blue Magoo", "Blue-Magoo",
  // Blue Moonshine
  "Blue Moonshine", "Blue-Moonshine",
  // Blue Dragon
  "Blue Dragon", "Blue-Dragon",
  // Blue Raspberry
  "Blue Raspberry", "Blue-Raspberry",
  // Blue Hawaiian
  "Blue Hawaiian", "Blue-Hawaiian",
  // Strawberry Diesel
  "Strawberry Diesel", "Strawberry-Diesel",
  // Strawberry Cough
  "Strawberry Cough",
  // Strawberry Banana
  "Strawberry Banana", "Strawberry-Banana",
  // Strawberry Fields
  "Strawberry Fields", "Strawberry-Fields",
  // Strawberry Kush
  "Strawberry Kush", "Strawberry-Kush",
  // Strawberry Lemonade
  "Strawberry Lemonade", "Strawberry-Lemonade",
  // Watermelon Zkittlez
  "Watermelon Zkittlez", "Watermelon-Zkittlez",
  // Watermelon Gushers
  "Watermelon Gushers", "Watermelon-Gushers",
  // Apple Bananas
  "Apple Bananas", "Apples and Bananas",
  // Apple Fritter
  "Apple Fritter",
  // Apple Jack
  "Apple Jack", "Apple-Jack",
  // Pineapple Chunk
  "Pineapple Chunk", "Pineapple-Chunk",
  // Pineapple Kush
  "Pineapple Kush", "Pineapple-Kush",
  // Pineapple Thai
  "Pineapple Thai", "Pineapple-Thai",
  // Mango Kush
  "Mango Kush",
  // Mango Sherbert
  "Mango Sherbert", "Mango-Sherbert",
  // Peach Rings
  "Peach Rings", "Peach-Rings",
  // Peach OG
  "Peach OG", "Peach-OG",
  // Papaya Punch
  "Papaya Punch", "Papaya-Punch",
  // Guava
  "Guava", "Guava Dawg", "Guava-Dawg",
  // Passion Fruit
  "Passion Fruit", "Passion-Fruit",
  // Dragon Fruit
  "Dragon Fruit", "Dragon-Fruit",
  // Lemon G
  "Lemon G", "Lemon-G",
  // Lemon Diesel
  "Lemon Diesel", "Lemon-Diesel",
  // Lemon OG
  "Lemon OG",
  // Lime OG
  "Lime OG", "Lime-OG",
  // Key Lime Pie
  "Key Lime Pie", "Key-Lime-Pie",
  // Lime Skunk
  "Lime Skunk", "Lime-Skunk",
  // Lime Sorbet
  "Lime Sorbet", "Lime-Sorbet",
  // Cherry Garcia
  "Cherry Garcia", "Cherry-Garcia",
  // Cherry Pie
  "Cherry Pie",
  // Cherry Wine
  "Cherry Wine", "Cherry-Wine",
  // Cherry AK
  "Cherry AK", "Cherry-AK",
  // Cherry Cookies
  "Cherry Cookies", "Cherry-Cookies",
  // Cherry Lime
  "Cherry Lime", "Cherry-Lime",
  // Cherry Bomb
  "Cherry Bomb", "Cherry-Bomb",
  // Cherry Cola
  "Cherry Cola", "Cherry-Cola",
  // Cherry Diesel
  "Cherry Diesel", "Cherry-Diesel",
  // Cherry OG
  "Cherry OG", "Cherry-OG",
  // Cherry Kush
  "Cherry Kush", "Cherry-Kush",
  // Cherry Garcia
  "Cherry Garcia",
  // Grapefruit Diesel
  "Grapefruit Diesel", "Grapefruit-Diesel",
  // Grape Ape
  "Grape Ape",
  // Grape Romulan
  "Grape Romulan", "Grape-Romulan",
  // Grape Pie
  "Grape Pie", "Grape-Pie",
  // Grape Soda
  "Grape Soda", "Grape-Soda",
  // Forbidden Fruit
  "Forbidden Fruit", "Forbidden-Fruit",
  // Forbidden Zkittlez
  "Forbidden Zkittlez", "Forbidden-Zkittlez",
  // Fruit Punch
  "Fruit Punch", "Fruit-Punch",
  // Fruit Loop
  "Fruit Loop", "Fruit-Loop",
  // Fruit Loops
  "Fruit Loops", "Fruit-Loops",
  // Tropicanna
  "Tropicanna", "Tropicanna Cookies",
  // Tropicana Cookies
  "Tropicana Cookies",
  // Tropicana Banana
  "Tropicana Banana", "Tropicana-Banana",
  // Banana Punch
  "Banana Punch", "Banana-Punch",
  // Banana OG
  "Banana OG", "Banana-OG",
  // Banana Kush
  "Banana Kush",
  // Banana Cream
  "Banana Cream", "Banana-Cream",
  // Banana Split
  "Banana Split", "Banana-Split",
  // Banana Sherbet
  "Banana Sherbet", "Banana-Sherbet",
  // Banana Bread
  "Banana Bread", "Banana-Bread",
  // Haze
  "Haze", "Original Haze", "Original-Haze",
  // Purple Haze
  "Purple Haze",
  // Lemon Haze
  "Lemon Haze",
  // Strawberry Haze
  "Strawberry Haze",
  // Mango Haze
  "Mango Haze",
  // Amnesia Haze
  "Amnesia Haze",
  // Pineapple Haze
  "Pineapple Haze",
  // O.G. Haze
  "O.G. Haze", "OG Haze", "OG-Haze",
  // Ghost Train Haze
  "Ghost Train Haze", "Ghost-Train-Haze",
  // Neville's Haze
  "Neville's Haze",
  // Silver Haze
  "Silver Haze", "Silver-Haze",
  // Super Silver Haze
  "Super Silver Haze",
  // Super Lemon Haze
  "Super Lemon Haze", "Super-Lemon-Haze",
  // Cookies
  "Cookies", "GSC", "Girl Scout Cookies",
  // Thin Mints
  "Thin Mints", "Thin-Mints",
  // Forum Cut
  "Forum Cut", "Forum-Cut",
  // Platinum Cookies
  "Platinum Cookies",
  // Animal Cookies
  "Animal Cookies",
  // Monster Cookies
  "Monster Cookies", "Monster-Cookies",
  // Candyland
  "Candyland",
  // Oreoz
  "Oreoz",
  // Ice Cream Cake
  "Ice Cream Cake",
  // Wedding Cake
  "Wedding Cake",
  // Birthday Cake
  "Birthday Cake",
  // Pound Cake
  "Pound Cake",
  // Cookies and Cream
  "Cookies and Cream",
  // Milk and Cookies
  "Milk and Cookies",
  // Chocolate Cookies
  "Chocolate Cookies", "Chocolate-Cookies",
  // Vanilla Cookies
  "Vanilla Cookies", "Vanilla-Cookies",
  // Mint Cookies
  "Mint Cookies", "Mint-Cookies",
  // Lemon Cookies
  "Lemon Cookies", "Lemon-Cookies",
  // Orange Cookies
  "Orange Cookies",
  // Cherry Cookies
  "Cherry Cookies",
  // Blue Cookies
  "Blue Cookies",
  // Purple Cookies
  "Purple Cookies", "Purple-Cookies",
  // Pink Cookies
  "Pink Cookies", "Pink-Cookies",
  // Runtz Cookies
  "Runtz Cookies", "Runtz-Cookies",
  // Gelato Cookies
  "Gelato Cookies", "Gelato-Cookies",
  // Sherbert Cookies
  "Sherbert Cookies", "Sherbert-Cookies",
  // Biscotti Cookies
  "Biscotti Cookies", "Biscotti-Cookies",
  // Zkittlez Cookies
  "Zkittlez Cookies", "Zkittlez-Cookies",
  // Do-Si-Dos
  "Do-Si-Dos",
  // Motorbreath
  "Motorbreath", "Motor Breath", "Motor-Breath",
  // Chemdog
  "Chemdog", "Chemdog 91", "Chemdog D", "Chem 91",
  // Chem 4
  "Chem 4", "Chem-4",
  // Chemdawg
  "Chemdawg",
  // Stardawg
  "Stardawg", "Stardog", "Star Dawg",
  // Tres Dawg
  "Tres Dawg", "Tres-Dawg",
  // Underdawg
  "Underdawg", "Underdawg",
  // Headband
  "Headband",
  // Sour D
  "Sour D", "Sour-D",
  // Diesel
  "Diesel", "NYC Diesel",
  // OG
  "OG", "OG Kush", "OG kush",
  // Fire
  "Fire OG", "Fire OG Kush",
  // Tahoe
  "Tahoe OG", "Tahoe",
  // SFV
  "SFV OG", "SFV",
  // Ghost
  "Ghost OG", "Ghost",
  // Skywalker
  "Skywalker OG", "Skywalker",
  // Larry
  "Larry OG", "Larry",
  // Louie
  "Louie XIII", "Louis XIII",
  // Legend
  "Legend OG", "Legend",
  // Alpha
  "Alpha OG", "Alpha",
  // WiFi
  "WiFi OG", "Wifi OG",
  // Face Off
  "Face Off OG", "Face-Off-OG",
  // True OG
  "True OG", "True-OG",
  // XXX OG
  "XXX OG", "XXX-OG",
  // Triple OG
  "Triple OG", "Triple-OG",
  // King Louie
  "King Louie", "King-Louie",
  // Scott's OG
  "Scott's OG", "Scotts OG",
  // Pre-98
  "Pre-98 Bubba", "Pre 98 Bubba",
  // Bubba
  "Bubba Kush", "Bubba",
  // Platinum
  "Platinum Kush", "Platinum OG",
  // Kosher
  "Kosher Kush", "Kosher",
  // Critical
  "Critical Kush", "Critical",
  // Master
  "Master Kush", "Master",
  // Hindu
  "Hindu Kush", "Hindu",
  // Purple
  "Purple Kush",
  // Black
  "Blackberry Kush", "Black Cherry",
  // Obama
  "Obama Kush", "Obama",
  // Lavender
  "Lavender Kush", "Lavender",
  // More OG variants for count
  "OG Kush", "og kush", "Og Kush", "OG kush",
  "Blue Dream", "blue dream", "Blue dream",
  "Sour Diesel", "sour diesel", "Sour diesel",
  "White Widow", "white widow", "White widow",
  "Girl Scout Cookies", "girl scout cookies", "GSC",
  "Gelato", "gelato", "Gelato 33", "Gelato #33",
  "Runtz", "runtz", "Pink Runtz", "White Runtz",
  "Wedding Cake", "wedding cake", "Wedding cake",
  "Gorilla Glue", "GG4", "Gorilla Glue #4",
  "Northern Lights", "northern lights",
  "Granddaddy Purple", "GDP", "Granddaddy Purp",
  "AK-47", "AK47", "ak 47",
  "Jack Herer", "jack herer",
  "Durban Poison", "durban poison",
  "Zkittlez", "Zkittles", "zkittlez",
  // Additional strains to reach ~1500
  "Blue Cookies", "blue cookies", "Blue-Cookies",
  "Purple Kush", "purple kush", "Purple-Kush",
  "Trainwreck", "trainwreck", "Train-Wreck",
  "Green Crack", "green crack", "Green-Crack",
  "Pineapple Express", "pineapple express", "Pineapple-Express",
  "Chemdawg", "chemdawg", "Chem-Dawg",
  "Bubba Kush", "bubba kush", "Bubba-Kush",
  "Amnesia Haze", "amnesia haze", "Amnesia-Haze",
  "Tangie", "tangie", "Tangerine Dream",
  "Grape Ape", "grape ape", "Grape-Ape",
  "Cherry Pie", "cherry pie", "Cherry-Pie",
  "Lemon Haze", "lemon haze", "Lemon-Haze",
  "Banana Kush", "banana kush", "Banana-Kush",
  "Strawberry Cough", "strawberry cough",
  "Ghost OG", "ghost og", "Ghost-OG",
  "Skywalker OG", "skywalker og", "Skywalker-OG",
  "Headband", "headband", "Headband OG",
  "Ice Cream Cake", "ice cream cake", "ICC",
  "Do-Si-Dos", "dosidos", "Do Si Dos",
  "Biscotti", "biscotti",
  "Apple Fritter", "apple fritter",
  "Gary Payton", "gary payton",
  "Zoap", "zoap", "ZOAP",
  "RS11", "rs11", "RS 11",
  "Permanent Marker", "permanent marker",
  "GMO", "gmo", "GMO Cookies",
  "Oreoz", "oreoz", "Oreo",
  "Jealousy", "jealousy", "Jealousy BX",
  "Cereal Milk", "cereal milk",
  "Mimosa", "mimosa", "Mimosa Evo",
  "Tropicana Cookies", "tropicana cookies",
  "Papaya", "papaya", "Papaya Cake",
  "Moonbow", "moonbow",
  "Donny Burger", "donny burger",
  "LA Confidential", "la confidential",
  "Alaskan Thunder", "ATF", "Alaskan Thunder Fuck",
  "Acapulco Gold", "acapulco gold",
  "Panama Red", "panama red",
  "Lamb's Bread", "lambs bread",
  "Chocolate Thai", "chocolate thai",
  "Columbian Gold", "colombian gold",
  "Maui Wowie", "maui wowie",
  "Malawi Gold", "malawi gold",
  "Cannatonic", "cannatonic",
  "Harlequin", "harlequin",
  "ACDC", "acdc", "AC/DC",
  "Charlotte's Web", "charlottes web",
  "Critical Mass", "critical mass",
  "Power Plant", "power plant",
  "Chronic", "chronic",
  "Cinderella 99", "C99", "Cindy 99",
  "Apollo 11", "apollo 11",
  "Space Queen", "space queen",
  "Jillybean", "jillybean",
  "Querkle", "querkle",
  "Chocolope", "chocolope",
  "Dutch Treat", "dutch treat",
  "Blueberry", "blueberry",
  "White Rhino", "white rhino",
  "Super Skunk", "super skunk",
  "Hash Plant", "hash plant",
  "Afgoo", "afgoo",
  "Mango", "mango", "Mango Kush",
  "Grapefruit", "grapefruit",
  "Shiva Skunk", "shiva skunk",
  "Sensi Star", "sensi star",
  "White Russian", "white russian",
  "Black Domina", "black domina",
  "Aurora Indica", "aurora indica",
  "Black Widow", "black widow",
  "Critical +", "critical plus",
  "Big Bud", "big bud",
  "Cookie Dawg", "cookie dawg",
  "Lemon Skunk", "lemon skunk",
  "Tangerine Dream", "tangerine dream",
  "S.A.G.E.", "SAGE", "sage",
  "J1", "J-1", "Jack One",
  "Vortex", "vortex",
  "Laughing Buddha", "laughing buddha",
  "Chocolate Chunk", "chocolate chunk",
  "Fire OG", "fire og", "Tahoe OG",
  "SFV OG", "sfv og",
  "Louie XIII", "louie 13",
  "Larry OG", "larry og",
  "Pre-98 Bubba", "pre 98 bubba",
  "Legend OG", "legend og",
  "Alpha OG", "alpha og",
  "WiFi OG", "wifi og",
  "Cherry Limeade", "cherry limeade",
  "Lemon Tree", "lemon tree",
  "Lemon OG", "lemon og",
  "Orange Cookies", "orange cookies",
  "Mandarin Cookies", "mandarin cookies",
  "Rainbow Belt", "rainbow belt",
  "Sherbacio", "sherbacio",
  "Sherblato", "sherblato",
  "Runtz OG", "runtz og",
  "Gelato Cake", "gelato cake",
  "Gelato Mint", "gelato mint",
  "Peanut Butter Breath", "PBB", "PB Breath",
  "Meat Breath", "meat breath",
  "Zkittlez OG", "zkittlez og",
  "Gas Face", "gas face",
  "Cookies and Cream", "cookies n cream",
  "Cotton Candy", "cotton candy",
  "Grape Stomper", "grape stomper",
  "Forbidden Fruit", "forbidden fruit",
  "Fruit Punch", "fruit punch",
  "Apples and Bananas", "apples and bananas",
  "Banana Punch", "banana punch",
  "Strawberry Banana", "strawberry banana",
  "Watermelon Zkittlez", "watermelon zkittlez",
  "Pineapple Chunk", "pineapple chunk",
  "Mango Sherbert", "mango sherbert",
  "Peach Rings", "peach rings",
  "Key Lime Pie", "key lime pie",
  "Cherry Garcia", "cherry garcia",
  "Grape Romulan", "grape romulan",
  "Grape Pie", "grape pie",
  "Motorbreath", "motorbreath",
  "Stardawg", "stardawg",
  "Chem 91", "chem 91",
  "Face Off OG", "face off og",
  "King Louie", "king louie",
  "Platinum Kush", "platinum kush",
  "Obama Kush", "obama kush",
  "Lavender Kush", "lavender kush",
  "Ghost Train Haze", "ghost train haze",
  "Neville's Haze", "nevilles haze",
  "Super Lemon Haze", "super lemon haze",
  "UK Cheese", "uk cheese",
  "Blue Cheese", "blue cheese",
  "Forum Cut Cookies", "forum cut",
  "Thin Mint Cookies", "thin mints",
  "Monster Cookies", "monster cookies",
  "Vanilla Cookies", "vanilla cookies",
  "Mint Cookies", "mint cookies",
  "Lemon Cookies", "lemon cookies",
  "Purple Cookies", "purple cookies",
  "Pink Cookies", "pink cookies",
  "Strawberry Kush", "strawberry kush",
  "Strawberry Diesel", "strawberry diesel",
  "Lemon Diesel", "lemon diesel",
  "Cherry Diesel", "cherry diesel",
  "Grapefruit Diesel", "grapefruit diesel",
  "Purple Diesel", "purple diesel",
  "Blue City Diesel", "blue city diesel",
  "Blue Fire", "blue fire",
  "Blue Magoo", "blue magoo",
  "Blue Moonshine", "blue moonshine",
  "Blue Hawaiian", "blue hawaiian",
  "Hawaiian Snow", "hawaiian snow",
  "Dragon Fruit", "dragon fruit",
  "Passion Fruit", "passion fruit",
  "Guava Dawg", "guava dawg",
  "Lime OG", "lime og",
  "Lime Skunk", "lime skunk",
  "Cherry Wine", "cherry wine",
  "Cherry AK", "cherry ak",
  "Cherry Bomb", "cherry bomb",
  "Grape Soda", "grape soda",
  "Grape Romulan", "grape romulan",
  "Fruit Loop", "fruit loop",
  "Melonatta", "melonatta",
  "London Lemonade", "london lemonade",
  "Biscoff", "biscoff",
  "Biscotti Sherbet", "biscotti sherbet",
  "Gelato 41", "gelato 41",
  "Gelato 42", "gelato 42",
  "Gelato 45", "gelato 45",
  "Sunset Sherbet", "sunset sherbet",
  "Sherbet", "sherbet",
  "Runtz Muffin", "runtz muffin",
  "Runtz Sorbet", "runtz sorbet",
  "Runtz Cake", "runtz cake",
  "Grape Runtz", "grape runtz",
  "Apple Runtz", "apple runtz",
  "Strawberry Runtz", "strawberry runtz",
  "Watermelon Runtz", "watermelon runtz",
  "Mendo Breath", "mendo breath",
  "Bruce Banner", "bruce banner",
  "MAC 1", "mac 1", "MAC1",
  "Triangle Kush", "triangle kush",
  "Purple Punch", "purple punch",
  "Granddaddy Purple", "granddaddy purple",
];

function main() {
  const outDir = join(VAULT_ROOT, "master_list");
  mkdirSync(outDir, { recursive: true });

  const rawList = RAW_STRAINS.map((name) => ({ name }));
  const outputPath = join(outDir, "raw_imported_names.json");
  writeFileSync(outputPath, JSON.stringify(rawList, null, 2));

  console.log(`Wrote ${outputPath} (${rawList.length} raw strain names)`);
}

main();
