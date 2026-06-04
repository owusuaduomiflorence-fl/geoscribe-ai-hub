export interface GameInfo {
  id: string;
  title: string;
  description: string;
  type: "quiz" | "match";
  category: "capitals" | "terms" | "physical" | "landmarks";
  icon: string;
}

export const GAMES: GameInfo[] = [
  {
    id: "african-capitals",
    title: "African Capitals",
    description: "Test your knowledge of African nation capitals.",
    type: "quiz",
    category: "capitals",
    icon: "Globe",
  },
  {
    id: "european-capitals",
    title: "European Capitals",
    description: "Identify the capitals of major European countries.",
    type: "quiz",
    category: "capitals",
    icon: "Map",
  },
  {
    id: "asian-capitals",
    title: "Asian Capitals",
    description: "Master the capitals across the Asian continent.",
    type: "quiz",
    category: "capitals",
    icon: "MapPin",
  },
  {
    id: "us-capitals",
    title: "US State Capitals",
    description: "Do you know all 50 US state capitals?",
    type: "quiz",
    category: "capitals",
    icon: "Flag",
  },
  {
    id: "geo-terms",
    title: "Geo Term Match",
    description: "Match geography terms with their correct definitions.",
    type: "match",
    category: "terms",
    icon: "Book",
  },
  {
    id: "landforms",
    title: "Landform Match",
    description: "Connect physical landforms to how they are created.",
    type: "match",
    category: "physical",
    icon: "Mountain",
  },
  {
    id: "climate-zones",
    title: "Climate Zones",
    description: "Match world climate zones with their characteristics.",
    type: "match",
    category: "physical",
    icon: "CloudSun",
  },
  {
    id: "landmarks",
    title: "World Landmarks",
    description: "Identify where these famous world landmarks are located.",
    type: "quiz",
    category: "landmarks",
    icon: "Compass",
  },
];

export const AFRICAN_CAPITALS: [string, string][] = [
  ["Ghana", "Accra"], ["Nigeria", "Abuja"], ["Kenya", "Nairobi"], ["Egypt", "Cairo"],
  ["South Africa", "Pretoria"], ["Senegal", "Dakar"], ["Morocco", "Rabat"], ["Ethiopia", "Addis Ababa"],
  ["Uganda", "Kampala"], ["Tanzania", "Dodoma"], ["Algeria", "Algiers"], ["Tunisia", "Tunis"],
  ["Cameroon", "Yaoundé"], ["Ivory Coast", "Yamoussoukro"], ["Zambia", "Lusaka"], ["Zimbabwe", "Harare"],
];

export const EUROPEAN_CAPITALS: [string, string][] = [
  ["France", "Paris"], ["Germany", "Berlin"], ["Italy", "Rome"], ["Spain", "Madrid"],
  ["United Kingdom", "London"], ["Poland", "Warsaw"], ["Greece", "Athens"], ["Portugal", "Lisbon"],
  ["Norway", "Oslo"], ["Sweden", "Stockholm"], ["Finland", "Helsinki"], ["Denmark", "Copenhagen"],
  ["Austria", "Vienna"], ["Switzerland", "Bern"], ["Belgium", "Brussels"], ["Netherlands", "Amsterdam"],
];

export const ASIAN_CAPITALS: [string, string][] = [
  ["Japan", "Tokyo"], ["China", "Beijing"], ["South Korea", "Seoul"], ["India", "New Delhi"],
  ["Thailand", "Bangkok"], ["Vietnam", "Hanoi"], ["Indonesia", "Jakarta"], ["Philippines", "Manila"],
  ["Malaysia", "Kuala Lumpur"], ["Singapore", "Singapore"], ["Pakistan", "Islamabad"], ["Turkey", "Ankara"],
  ["Saudi Arabia", "Riyadh"], ["Israel", "Jerusalem"], ["Jordan", "Amman"], ["Lebanon", "Beirut"],
];

export const US_CAPITALS: [string, string][] = [
  ["California", "Sacramento"], ["Texas", "Austin"], ["Florida", "Tallahassee"], ["New York", "Albany"],
  ["Illinois", "Springfield"], ["Georgia", "Atlanta"], ["North Carolina", "Raleigh"], ["Ohio", "Columbus"],
  ["Michigan", "Lansing"], ["Washington", "Olympia"], ["Arizona", "Phoenix"], ["Massachusetts", "Boston"],
  ["Tennessee", "Nashville"], ["Virginia", "Richmond"], ["Colorado", "Denver"], ["Oregon", "Salem"],
];

export const GEO_TERMS: [string, string][] = [
  ["Equator", "Imaginary line at 0° latitude"],
  ["Delta", "Triangular landform at a river mouth"],
  ["Savanna", "Tropical grassland with scattered trees"],
  ["Erosion", "Wearing away of land by water/wind"],
  ["Latitude", "Distance north or south of the equator"],
  ["Tributary", "Smaller river joining a larger one"],
  ["Plateau", "A large flat area of land that is high above sea level"],
  ["Archipelago", "A group or chain of islands"],
];

export const LANDFORMS: [string, string][] = [
  ["Canyon", "Deep valley with very steep sides carved by a river"],
  ["Isthmus", "Narrow strip of land connecting two larger landmasses"],
  ["Peninsula", "Land surrounded by water on three sides"],
  ["Basin", "Depression on the earth's surface often containing water"],
  ["Glacier", "Slowly moving mass of ice formed by snow accumulation"],
  ["Fjord", "Long, narrow, deep inlet of the sea between high cliffs"],
  ["Butte", "Isolated hill with steep sides and a flat top"],
  ["Atoll", "Ring-shaped coral reef including a coral rim that encircles a lagoon"],
];

export const CLIMATE_ZONES: [string, string][] = [
  ["Tropical", "Hot and humid, found near the equator"],
  ["Arid", "Very dry with little rainfall, desert conditions"],
  ["Mediterranean", "Hot, dry summers and cool, wet winters"],
  ["Tundra", "Cold, treeless plain with permafrost"],
  ["Subarctic", "Long, cold winters and short, cool summers"],
  ["Humid Continental", "Large seasonal temperature differences, warm to hot summers"],
  ["Marine West Coast", "Cool summers, mild winters, and ample rainfall year-round"],
  ["Highland", "Climate varies with elevation, usually cooler than surrounding lowlands"],
];

export const LANDMARKS: [string, string][] = [
  ["Great Pyramid of Giza", "Egypt"], ["Eiffel Tower", "France"], ["Great Wall of China", "China"], ["Machu Picchu", "Peru"],
  ["Taj Mahal", "India"], ["Statue of Liberty", "USA"], ["Colosseum", "Italy"], ["Christ the Redeemer", "Brazil"],
  ["Mount Everest", "Nepal/China"], ["Angkor Wat", "Cambodia"], ["Petra", "Jordan"], ["Easter Island Moai", "Chile"],
];
