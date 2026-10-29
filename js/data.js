/* Raajje Stay — sample data.
   Properties and fares are illustrative samples for the demo build.
   Tax rules (MIRA): T-GST 17% since 1 Jul 2025; Green Tax USD 12 per guest per night
   (resorts, hotels, vessels, guesthouses over 50 rooms) or USD 6 (inhabited-island
   guesthouses with 50 rooms or fewer), since 1 Jan 2025. Locals, residents and
   infants under 2 are exempt from Green Tax. */

window.RS_DATA = (function () {
  const islands = [
    { id: 'male', name: 'Malé', atoll: 'Kaafu', code: 'K.' },
    { id: 'hulhumale', name: 'Hulhumalé', atoll: 'Kaafu', code: 'K.' },
    { id: 'maafushi', name: 'Maafushi', atoll: 'Kaafu', code: 'K.' },
    { id: 'thulusdhoo', name: 'Thulusdhoo', atoll: 'Kaafu', code: 'K.' },
    { id: 'kudafinolhu', name: 'Kudafinolhu', atoll: 'Kaafu', code: 'K.', private: true },
    { id: 'ukulhas', name: 'Ukulhas', atoll: 'Alif Alif', code: 'AA.' },
    { id: 'rasdhoo', name: 'Rasdhoo', atoll: 'Alif Alif', code: 'AA.' },
    { id: 'dhigurah', name: 'Dhigurah', atoll: 'Alif Dhaal', code: 'ADh.' },
    { id: 'mashuraa', name: 'Mas Huraa', atoll: 'Alif Dhaal', code: 'ADh.', private: true },
    { id: 'fulidhoo', name: 'Fulidhoo', atoll: 'Vaavu', code: 'V.' },
    { id: 'dharavandhoo', name: 'Dharavandhoo', atoll: 'Baa', code: 'B.' },
    { id: 'fushivelhi', name: 'Fushi Velhi', atoll: 'Baa', code: 'B.', private: true },
    { id: 'fuvahmulah', name: 'Fuvahmulah', atoll: 'Gnaviyani', code: 'Gn.' },
    { id: 'addu', name: 'Addu City', atoll: 'Seenu', code: 'S.' }
  ];

  const types = {
    guesthouse: { label: 'Guesthouse', plural: 'Local island guesthouses', note: 'Stay with island families, eat local, pay less.' },
    resort: { label: 'Resort', plural: 'Resorts', note: 'One island, one resort. Villas on the beach or over the lagoon.' },
    hotel: { label: 'City hotel', plural: 'City hotels', note: 'Malé, Hulhumalé and Addu. Close to ferries, flights and offices.' },
    apartment: { label: 'Apartment', plural: 'Short-term apartments', note: 'For work trips, hospital visits and longer stays in town.' }
  };

  const properties = [
    {
      id: 'ocean-sand-inn', name: 'Ocean Sand Inn', type: 'guesthouse', island: 'maafushi', roomsTotal: 18,
      rating: 8.9, reviews: 412, tourist: true, route: 'maafushi', seed: 11,
      blurb: 'Three-storey guesthouse a two-minute walk from Maafushi’s bikini beach. Breakfast is served on the rooftop, and the owner runs sandbank and snorkel trips most mornings.',
      amenities: ['Breakfast included', 'Bikini beach nearby', 'Excursions desk', 'Air conditioning', 'Wi-Fi', 'Rooftop terrace'],
      rooms: [
        { name: 'Standard double', beds: '1 queen', sleeps: 2, size: 18, local: 780, intl: 72 },
        { name: 'Sea view double', beds: '1 king, balcony', sleeps: 2, size: 22, local: 1050, intl: 95 },
        { name: 'Family triple', beds: '1 king + 1 single', sleeps: 3, size: 28, local: 1300, intl: 118 }
      ]
    },
    {
      id: 'kandu-surf-house', name: 'Kandu Surf House', type: 'guesthouse', island: 'thulusdhoo', roomsTotal: 12,
      rating: 9.1, reviews: 268, tourist: true, route: 'thulusdhoo', seed: 23,
      blurb: 'Twelve rooms for surfers and slow travellers, steps from the Cokes and Chickens breaks. Board racks, wax and a local surf guide on call from March to October.',
      amenities: ['Surf guide', 'Board storage', 'Breakfast included', 'Bicycles', 'Wi-Fi', 'Air conditioning'],
      rooms: [
        { name: 'Garden double', beds: '1 queen', sleeps: 2, size: 16, local: 650, intl: 60 },
        { name: 'Twin room', beds: '2 singles', sleeps: 2, size: 18, local: 700, intl: 64 },
        { name: 'Surf loft', beds: '1 king + bunk', sleeps: 4, size: 30, local: 1250, intl: 112 }
      ]
    },
    {
      id: 'dhigu-beach-lodge', name: 'Dhigu Beach Lodge', type: 'guesthouse', island: 'dhigurah', roomsTotal: 14,
      rating: 9.3, reviews: 337, tourist: true, route: 'dhigurah', seed: 37,
      blurb: 'On the long sandbank island of South Ari, where whale sharks feed on the outer reef all year. Snorkel trips leave from the jetty at 8:30.',
      amenities: ['Whale shark trips', 'Breakfast included', 'Long beach', 'Air conditioning', 'Wi-Fi', 'Airport pickup'],
      rooms: [
        { name: 'Deluxe double', beds: '1 king', sleeps: 2, size: 20, local: 900, intl: 85 },
        { name: 'Beach bungalow', beds: '1 king, outdoor shower', sleeps: 2, size: 26, local: 1250, intl: 115 },
        { name: 'Family room', beds: '1 king + 2 singles', sleeps: 4, size: 34, local: 1600, intl: 148 }
      ]
    },
    {
      id: 'fulidhoo-reef-rooms', name: 'Fulidhoo Reef Rooms', type: 'guesthouse', island: 'fulidhoo', roomsTotal: 8,
      rating: 8.7, reviews: 154, tourist: true, route: 'fulidhoo', seed: 41,
      blurb: 'A quiet eight-room house on a small Vaavu island. Nurse sharks gather at the harbour every evening, and the house reef is a short swim from the beach.',
      amenities: ['House reef', 'Breakfast included', 'Fishing trips', 'Air conditioning', 'Wi-Fi'],
      rooms: [
        { name: 'Standard double', beds: '1 queen', sleeps: 2, size: 16, local: 600, intl: 58 },
        { name: 'Superior double', beds: '1 king', sleeps: 2, size: 20, local: 750, intl: 70 }
      ]
    },
    {
      id: 'ukulhas-green-stay', name: 'Ukulhas Green Stay', type: 'guesthouse', island: 'ukulhas', roomsTotal: 10,
      rating: 9.0, reviews: 221, tourist: true, route: 'ukulhas', seed: 53,
      blurb: 'Ukulhas composts and recycles its own waste, and this guesthouse follows suit: solar hot water, refill stations and a garden that supplies the kitchen.',
      amenities: ['Solar hot water', 'Breakfast included', 'Bikini beach nearby', 'Dive centre partner', 'Wi-Fi'],
      rooms: [
        { name: 'Garden double', beds: '1 queen', sleeps: 2, size: 18, local: 850, intl: 80 },
        { name: 'Deluxe triple', beds: '1 king + 1 single', sleeps: 3, size: 26, local: 1150, intl: 106 }
      ]
    },
    {
      id: 'rasdhoo-divers-inn', name: 'Rasdhoo Divers Inn', type: 'guesthouse', island: 'rasdhoo', roomsTotal: 16,
      rating: 8.6, reviews: 189, tourist: true, route: 'rasdhoo', seed: 67,
      blurb: 'Built around its own dive centre. Early-morning trips to Rasdhoo Madivaru for hammerheads, and two dives a day for guests on dive packages.',
      amenities: ['Dive centre on site', 'Breakfast included', 'Nitrox', 'Air conditioning', 'Wi-Fi'],
      rooms: [
        { name: 'Standard double', beds: '1 queen', sleeps: 2, size: 17, local: 700, intl: 65 },
        { name: 'Diver twin', beds: '2 singles, gear room', sleeps: 2, size: 20, local: 760, intl: 70 }
      ]
    },
    {
      id: 'baa-manta-guesthouse', name: 'Baa Manta Guesthouse', type: 'guesthouse', island: 'dharavandhoo', roomsTotal: 20,
      rating: 9.2, reviews: 296, tourist: true, route: 'dharavandhoo', seed: 79,
      blurb: 'Ten minutes by boat from Hanifaru Bay in the Baa Atoll UNESCO Biosphere Reserve. Manta season runs roughly June to November; rangers set the daily snorkel slots.',
      amenities: ['Manta trips', 'Breakfast included', 'Airport pickup', 'Air conditioning', 'Wi-Fi'],
      rooms: [
        { name: 'Deluxe double', beds: '1 king', sleeps: 2, size: 22, local: 950, intl: 88 },
        { name: 'Deluxe twin', beds: '2 singles', sleeps: 2, size: 22, local: 950, intl: 88 },
        { name: 'Junior suite', beds: '1 king, sofa bed', sleeps: 3, size: 32, local: 1400, intl: 130 }
      ]
    },
    {
      id: 'tiger-point-inn', name: 'Tiger Point Inn', type: 'guesthouse', island: 'fuvahmulah', roomsTotal: 22,
      rating: 8.8, reviews: 143, tourist: true, route: 'fuvahmulah', seed: 83,
      blurb: 'Fuvahmulah is a single island atoll with freshwater lakes and tiger sharks off the harbour. Bikes are free; the island is 8 km end to end.',
      amenities: ['Shark dive partner', 'Free bicycles', 'Breakfast included', 'Airport pickup', 'Wi-Fi'],
      rooms: [
        { name: 'Standard double', beds: '1 queen', sleeps: 2, size: 18, local: 800, intl: 75 },
        { name: 'Family room', beds: '1 king + 2 singles', sleeps: 4, size: 32, local: 1350, intl: 125 }
      ]
    },
    {
      id: 'fushi-velhi', name: 'Fushi Velhi Resort & Spa', type: 'resort', island: 'fushivelhi', roomsTotal: 80,
      rating: 9.5, reviews: 508, tourist: true, route: 'fushivelhi', seed: 97,
      blurb: 'A private island in Baa Atoll with 80 villas, half of them over the lagoon. Seaplane from Velana in 40 minutes. Half board is included at resident rates.',
      amenities: ['Overwater villas', 'Spa', 'Kids club', 'House reef', 'Seaplane transfer', 'Half board'],
      rooms: [
        { name: 'Beach villa', beds: '1 king, plunge pool', sleeps: 3, size: 120, local: 9800, intl: 720 },
        { name: 'Water villa', beds: '1 king, lagoon deck', sleeps: 2, size: 140, local: 14500, intl: 1050 },
        { name: 'Two-bedroom family villa', beds: '2 kings', sleeps: 5, size: 260, local: 18000, intl: 1380 }
      ]
    },
    {
      id: 'kudafinolhu', name: 'Kudafinolhu Island Resort', type: 'resort', island: 'kudafinolhu', roomsTotal: 60,
      rating: 8.9, reviews: 377, tourist: true, route: 'kudafinolhu', seed: 101,
      blurb: 'Twenty-five minutes by speedboat from the airport, which makes it the easy weekend escape for Malé families. Day passes for residents on Fridays and Saturdays.',
      amenities: ['Speedboat transfer', 'All inclusive option', 'Kids club', 'Pool', 'Water sports'],
      rooms: [
        { name: 'Garden room', beds: '1 king', sleeps: 3, size: 48, local: 6200, intl: 480 },
        { name: 'Beach villa', beds: '1 king', sleeps: 3, size: 72, local: 8400, intl: 640 },
        { name: 'Water villa', beds: '1 king', sleeps: 2, size: 85, local: 11200, intl: 860 }
      ]
    },
    {
      id: 'mas-huraa', name: 'Mas Huraa Reef Resort', type: 'resort', island: 'mashuraa', roomsTotal: 100,
      rating: 9.4, reviews: 612, tourist: true, route: 'mashuraa', seed: 113,
      blurb: 'South Ari Atoll, on the whale shark route. Every villa faces west for the sunset, and the house reef drop-off is 40 metres from the beach.',
      amenities: ['Overwater villas', 'Dive centre', 'Spa', 'House reef', 'Seaplane transfer'],
      rooms: [
        { name: 'Sunset beach villa', beds: '1 king', sleeps: 3, size: 110, local: 11500, intl: 860 },
        { name: 'Sunset water villa', beds: '1 king, pool', sleeps: 2, size: 150, local: 16800, intl: 1240 }
      ]
    },
    {
      id: 'gan-lagoon', name: 'Gan Lagoon Retreat', type: 'resort', island: 'addu', roomsTotal: 45,
      rating: 8.7, reviews: 201, tourist: true, route: 'addu', seed: 127,
      blurb: 'South of the equator in Addu City, ten minutes by car from Gan airport. Cycle the causeway, dive the British Loyalty wreck, and swim with turtles in the lagoon.',
      amenities: ['Lagoon pool', 'Wreck diving', 'Bicycles', 'Airport transfer by car', 'Breakfast included'],
      rooms: [
        { name: 'Lagoon room', beds: '1 king', sleeps: 2, size: 45, local: 5400, intl: 410 },
        { name: 'Lagoon suite', beds: '1 king, sofa bed', sleeps: 4, size: 75, local: 7600, intl: 575 }
      ]
    },
    {
      id: 'majeedhee-central', name: 'Majeedhee Central Hotel', type: 'hotel', island: 'male', roomsTotal: 40,
      rating: 8.4, reviews: 523, tourist: true, route: 'male', seed: 131,
      blurb: 'On Malé’s main shopping street, a short walk from the airport ferry and government offices. Quiet rooms on the upper floors and a rooftop cafe.',
      amenities: ['Airport ferry 5 min walk', 'Rooftop cafe', 'Business desk', 'Air conditioning', 'Wi-Fi'],
      rooms: [
        { name: 'City double', beds: '1 queen', sleeps: 2, size: 18, local: 1200, intl: 110 },
        { name: 'Executive double', beds: '1 king, desk', sleeps: 2, size: 24, local: 1550, intl: 140 }
      ]
    },
    {
      id: 'hulhumale-beachfront', name: 'Hulhumalé Beachfront Hotel', type: 'hotel', island: 'hulhumale', roomsTotal: 70,
      rating: 8.6, reviews: 744, tourist: true, route: 'hulhumale', seed: 139,
      blurb: 'Facing the Hulhumalé public beach, ten minutes from Velana airport. Free shuttle around the clock, so it suits late arrivals and early departures.',
      amenities: ['Free airport shuttle 24h', 'Beachfront', 'Restaurant', 'Late check-out', 'Wi-Fi'],
      rooms: [
        { name: 'Superior double', beds: '1 king', sleeps: 2, size: 24, local: 1450, intl: 125 },
        { name: 'Ocean view double', beds: '1 king, balcony', sleeps: 2, size: 26, local: 1750, intl: 150 },
        { name: 'Family room', beds: '1 king + 2 singles', sleeps: 4, size: 36, local: 2200, intl: 190 }
      ]
    },
    {
      id: 'hithadhoo-equator', name: 'Hithadhoo Equator Hotel', type: 'hotel', island: 'addu', roomsTotal: 30,
      rating: 8.2, reviews: 112, tourist: true, route: 'addu', seed: 149,
      blurb: 'A practical base in Addu City, near the regional hospital and Hithadhoo port. Car hire and airport pickup can be added at the desk.',
      amenities: ['Airport pickup', 'Near regional hospital', 'Restaurant', 'Air conditioning', 'Wi-Fi'],
      rooms: [
        { name: 'Standard double', beds: '1 queen', sleeps: 2, size: 20, local: 900, intl: 82 },
        { name: 'Twin room', beds: '2 singles', sleeps: 2, size: 20, local: 900, intl: 82 }
      ]
    },
    {
      id: 'henveiru-flats', name: 'Henveiru Serviced Flats', type: 'apartment', island: 'male', roomsTotal: 12,
      rating: 8.5, reviews: 98, tourist: false, route: 'male', seed: 157,
      blurb: 'Furnished flats in Henveiru, close to the main hospital. Popular with families travelling from the atolls for treatment, exams or work. Weekly rates on request.',
      amenities: ['Full kitchen', 'Washing machine', 'Near hospital', 'Lift', 'Wi-Fi'],
      rooms: [
        { name: 'One-bedroom flat', beds: '1 queen, sofa bed', sleeps: 3, size: 40, local: 850, intl: null },
        { name: 'Two-bedroom flat', beds: '1 queen + 2 singles', sleeps: 5, size: 62, local: 1100, intl: null }
      ]
    },
    {
      id: 'phase-two-apartments', name: 'Phase Two Apartments', type: 'apartment', island: 'hulhumale', roomsTotal: 24,
      rating: 8.7, reviews: 176, tourist: true, route: 'hulhumale', seed: 163,
      blurb: 'Tourist-registered apartments in Hulhumalé Phase 2, with a kitchen, balcony and space to spread out. Fifteen minutes to the airport by taxi.',
      amenities: ['Full kitchen', 'Balcony', 'Washing machine', 'Parking', 'Wi-Fi'],
      rooms: [
        { name: 'Studio', beds: '1 queen', sleeps: 2, size: 32, local: 950, intl: 85 },
        { name: 'Two-bedroom apartment', beds: '1 king + 2 singles', sleeps: 5, size: 70, local: 1650, intl: 145 }
      ]
    }
  ];

  /* Transfer options per destination route.
     from: 'MLE' Velana International Airport, 'MLE-F' Malé ferry terminal. */
  const routes = {
    maafushi: [
      { mode: 'speedboat', from: 'MLE', mins: 50, times: ['10:00', '13:30', '16:00', '18:00'], days: 'Daily', local: 350, intl: 35 },
      { mode: 'ferry', from: 'MLE-F', mins: 90, times: ['15:00'], days: 'Sat–Thu', local: 30, intl: 3 }
    ],
    thulusdhoo: [
      { mode: 'speedboat', from: 'MLE', mins: 35, times: ['10:30', '15:30', '17:30'], days: 'Daily', local: 300, intl: 30 },
      { mode: 'ferry', from: 'MLE-F', mins: 90, times: ['15:00'], days: 'Sat–Thu', local: 25, intl: 3 }
    ],
    dhigurah: [
      { mode: 'speedboat', from: 'MLE', mins: 105, times: ['10:00', '15:30'], days: 'Daily', local: 750, intl: 65 },
      { mode: 'flight', from: 'MLE', mins: 45, times: ['08:30', '14:15'], days: 'Daily', local: 1400, intl: 120, via: 'Flight to Maamigili, then 20 min boat' }
    ],
    fulidhoo: [
      { mode: 'speedboat', from: 'MLE', mins: 70, times: ['10:00', '15:30'], days: 'Daily', local: 450, intl: 45 },
      { mode: 'ferry', from: 'MLE-F', mins: 210, times: ['08:00'], days: 'Sat, Tue, Thu', local: 40, intl: 4 }
    ],
    ukulhas: [
      { mode: 'speedboat', from: 'MLE', mins: 75, times: ['10:30', '16:00'], days: 'Daily', local: 600, intl: 55 }
    ],
    rasdhoo: [
      { mode: 'speedboat', from: 'MLE', mins: 60, times: ['10:00', '15:00', '16:30'], days: 'Daily', local: 500, intl: 50 },
      { mode: 'ferry', from: 'MLE-F', mins: 240, times: ['09:00'], days: 'Sat–Thu', local: 45, intl: 4 }
    ],
    dharavandhoo: [
      { mode: 'flight', from: 'MLE', mins: 35, times: ['07:30', '13:00', '16:45'], days: 'Daily', local: 1600, intl: 130, via: 'Domestic flight to Dharavandhoo airport' },
      { mode: 'speedboat', from: 'MLE', mins: 150, times: ['11:00'], days: 'Daily', local: 900, intl: 80 }
    ],
    fuvahmulah: [
      { mode: 'flight', from: 'MLE', mins: 70, times: ['06:45', '12:15', '17:30'], days: 'Daily', local: 1950, intl: 165, via: 'Domestic flight to Fuvahmulah airport' }
    ],
    addu: [
      { mode: 'flight', from: 'MLE', mins: 75, times: ['06:30', '10:00', '15:00', '19:30'], days: 'Daily', local: 1950, intl: 170, via: 'Domestic flight to Gan, then car' }
    ],
    male: [
      { mode: 'ferry', from: 'MLE', mins: 10, times: ['Every 10–15 min'], days: 'Daily', local: 10, intl: 1, via: 'Airport ferry to Malé jetty' },
      { mode: 'car', from: 'MLE', mins: 15, times: ['On arrival'], days: 'Daily', local: 75, intl: 10, via: 'Taxi over the Sinamalé Bridge' }
    ],
    hulhumale: [
      { mode: 'car', from: 'MLE', mins: 10, times: ['On arrival'], days: 'Daily', local: 75, intl: 8, via: 'Taxi' },
      { mode: 'bus', from: 'MLE', mins: 20, times: ['Every 15 min'], days: 'Daily', local: 10, intl: 1, via: 'Public bus' }
    ],
    kudafinolhu: [
      { mode: 'speedboat', from: 'MLE', mins: 25, times: ['On arrival'], days: 'Daily', local: 1200, intl: 120, via: 'Resort speedboat from the arrivals jetty' }
    ],
    fushivelhi: [
      { mode: 'seaplane', from: 'MLE', mins: 40, times: ['08:00', '11:00', '14:30'], days: 'Daily, daylight only', local: 6200, intl: 450 }
    ],
    mashuraa: [
      { mode: 'seaplane', from: 'MLE', mins: 30, times: ['07:45', '10:30', '14:00'], days: 'Daily, daylight only', local: 6800, intl: 520 }
    ]
  };

  const origins = { 'MLE': 'Velana International Airport', 'MLE-F': 'Malé ferry terminal' };

  const reviewers = [
    { n: 'Aishath R.', c: 'Malé', resident: true }, { n: 'Hassan M.', c: 'Hithadhoo', resident: true },
    { n: 'Mariyam S.', c: 'Kulhudhuffushi', resident: true }, { n: 'Ibrahim N.', c: 'Fuvahmulah', resident: true },
    { n: 'Sofia L.', c: 'Italy' }, { n: 'Daniel K.', c: 'Germany' }, { n: 'Priya V.', c: 'India' },
    { n: 'James O.', c: 'United Kingdom' }, { n: 'Mei T.', c: 'China' }, { n: 'Anna P.', c: 'Russia' }
  ];
  const reviewText = [
    'Clean room, friendly staff and they sorted our boat when the weather changed.',
    'Exactly as described. Breakfast was generous and the beach is very close.',
    'The excursions were the highlight. Book the sandbank trip early in the week.',
    'Good value at the resident rate. We will come back during school holidays.',
    'Quiet at night, strong Wi-Fi, and the staff helped with ferry times.',
    'Water was clear even in the wet season. The reef right off the beach is lovely.',
    'Room was smaller than expected but spotless, and the location is perfect.',
    'Arrived late after a delayed flight and someone was still waiting at the jetty.'
  ];

  return { islands, types, properties, routes, origins, reviewers, reviewText };
})();
