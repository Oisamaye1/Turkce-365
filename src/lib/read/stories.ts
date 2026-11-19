/**
 * Graded reading: short stories from A0 to B1, set in Northern Cyprus.
 * Each line has its translation; tapping a word shows its pieces (via the word analyser).
 */
export interface Story {
  id: string;
  title: string;
  titleTr: string;
  level: "A0" | "A1" | "A2" | "B1";
  /** Plan stage it fits (1–6). */
  stage: number;
  blurb: string;
  lines: [tr: string, en: string][];
  questions: { q: string; options: string[]; answer: number }[];
}

export const STORIES: Story[] = [
  {
    id: "merhaba-elif",
    title: "Hello, I'm Elif",
    titleTr: "Merhaba, ben Elif",
    level: "A0",
    stage: 1,
    blurb: "Elif introduces herself and her cat.",
    lines: [
      ["Merhaba! Benim adım Elif.", "Hello! My name is Elif."],
      ["Ben öğretmenim.", "I'm a teacher."],
      ["Lefkoşa'da yaşıyorum.", "I live in Nicosia."],
      ["Bu benim kedim. Adı Pamuk.", "This is my cat. Her name is Pamuk."],
      ["Pamuk çok küçük ve beyaz.", "Pamuk is very small and white."],
      ["Sen kimsin? Adın ne?", "Who are you? What's your name?"],
    ],
    questions: [
      { q: "What does Elif do?", options: ["She's a teacher", "She's a doctor", "She's a student"], answer: 0 },
      { q: "Where does she live?", options: ["Girne", "Nicosia", "Istanbul"], answer: 1 },
      { q: "What colour is Pamuk?", options: ["Black", "Grey", "White"], answer: 2 },
    ],
  },
  {
    id: "kafede",
    title: "At the café",
    titleTr: "Kafede",
    level: "A0",
    stage: 1,
    blurb: "Tea, coffee, sugar and no milk.",
    lines: [
      ["Kafede bir masa var.", "There's a table in the café."],
      ["Masada bir çay ve bir kahve var.", "There's a tea and a coffee on the table."],
      ["Çay benim, kahve senin.", "The tea is mine, the coffee is yours."],
      ["Şeker var mı?", "Is there sugar?"],
      ["Evet, şeker var. Süt yok.", "Yes, there's sugar. There's no milk."],
      ["Garson geliyor: \"Buyurun!\"", "The waiter comes: \"Here you are!\""],
      ["\"Teşekkür ederim!\"", "\"Thank you!\""],
    ],
    questions: [
      { q: "What's on the table?", options: ["Two teas", "A tea and a coffee", "Water"], answer: 1 },
      { q: "Is there milk?", options: ["Yes", "No", "We don't know"], answer: 1 },
    ],
  },
  {
    id: "ailem",
    title: "My family",
    titleTr: "Benim ailem",
    level: "A1",
    stage: 2,
    blurb: "Can talks about his parents, his sister and his brother.",
    lines: [
      ["Benim adım Can. Otuz iki yaşındayım.", "My name is Can. I'm thirty-two."],
      ["Annem ve babam Gazimağusa'da yaşıyor.", "My mum and dad live in Famagusta."],
      ["Bir ablam ve bir erkek kardeşim var.", "I have an older sister and a younger brother."],
      ["Ablam doktor. Hastanede çalışıyor.", "My sister is a doctor. She works at the hospital."],
      ["Kardeşim öğrenci. Üniversitede İngilizce okuyor.", "My brother is a student. He studies English at university."],
      ["Hafta sonları hep birlikte yemek yiyoruz.", "At weekends we always eat together."],
      ["Annemin yemekleri çok lezzetli!", "My mum's food is delicious!"],
    ],
    questions: [
      { q: "How old is Can?", options: ["23", "32", "42"], answer: 1 },
      { q: "Where does his sister work?", options: ["At a school", "At a bank", "At the hospital"], answer: 2 },
      { q: "What does the family do at weekends?", options: ["They eat together", "They go to the sea", "They work"], answer: 0 },
    ],
  },
  {
    id: "pazarda",
    title: "Sunday at the market",
    titleTr: "Pazar günü pazarda",
    level: "A1",
    stage: 2,
    blurb: "Buying tomatoes and lemons, and asking the price.",
    lines: [
      ["Bugün pazar. Pazara gidiyorum.", "Today is Sunday. I'm going to the market."],
      ["Pazarda çok insan var.", "There are lots of people at the market."],
      ["Domates, salatalık ve limon alıyorum.", "I'm buying tomatoes, cucumbers and lemons."],
      ["\"Domatesler kaç lira?\" diye soruyorum.", "\"How much are the tomatoes?\" I ask."],
      ["Satıcı: \"Kilosu kırk lira, abla.\"", "The seller: \"Forty lira a kilo, sister.\""],
      ["İki kilo domates ve bir kilo limon istiyorum.", "I'd like two kilos of tomatoes and a kilo of lemons."],
      ["Toplam yüz lira ödüyorum.", "I pay a hundred lira in total."],
    ],
    questions: [
      { q: "What day is it?", options: ["Saturday", "Sunday", "Monday"], answer: 1 },
      { q: "How much is a kilo of tomatoes?", options: ["14 lira", "40 lira", "100 lira"], answer: 1 },
    ],
  },
  {
    id: "otobuste",
    title: "On the bus to Girne",
    titleTr: "Girne otobüsünde",
    level: "A1",
    stage: 2,
    blurb: "A morning ride over the mountains, and a curious neighbour.",
    lines: [
      ["Sabah saat sekizde otobüse biniyorum.", "At eight in the morning I get on the bus."],
      ["Otobüs Lefkoşa'dan Girne'ye gidiyor.", "The bus goes from Nicosia to Kyrenia."],
      ["Yol yarım saat sürüyor.", "The journey takes half an hour."],
      ["Pencereden dağları ve denizi görüyorum.", "From the window I see the mountains and the sea."],
      ["Yanımda yaşlı bir kadın oturuyor.", "An old woman is sitting next to me."],
      ["Bana \"Nerelisin, kızım?\" diye soruyor.", "She asks me, \"Where are you from, dear?\""],
      ["\"İngiltere'denim ama Kıbrıs'ta yaşıyorum,\" diyorum.", "\"I'm from England, but I live in Cyprus,\" I say."],
    ],
    questions: [
      { q: "Where does the bus go?", options: ["Nicosia to Kyrenia", "Kyrenia to Famagusta", "Nicosia to the airport"], answer: 0 },
      { q: "How long is the journey?", options: ["Ten minutes", "Half an hour", "An hour"], answer: 1 },
      { q: "Where is the writer from?", options: ["Cyprus", "Turkey", "England"], answer: 2 },
    ],
  },
  {
    id: "bir-gunum",
    title: "A day of mine",
    titleTr: "Bir günüm",
    level: "A1",
    stage: 3,
    blurb: "From seven in the morning to eleven at night.",
    lines: [
      ["Her sabah yedide kalkıyorum.", "Every morning I get up at seven."],
      ["Önce duş alıyorum, sonra kahvaltı yapıyorum.", "First I have a shower, then I have breakfast."],
      ["Kahvaltıda peynir, zeytin ve ekmek yiyorum.", "For breakfast I eat cheese, olives and bread."],
      ["Sekiz buçukta işe gidiyorum.", "At half past eight I go to work."],
      ["Öğlen arkadaşlarımla yemek yiyorum.", "At noon I have lunch with my friends."],
      ["Akşam eve geliyorum ve yemek yapıyorum.", "In the evening I come home and cook."],
      ["Saat on birde yatıyorum.", "I go to bed at eleven."],
    ],
    questions: [
      { q: "What's for breakfast?", options: ["Eggs and toast", "Cheese, olives and bread", "Only coffee"], answer: 1 },
      { q: "When does the writer go to bed?", options: ["At ten", "At eleven", "At midnight"], answer: 1 },
    ],
  },
  {
    id: "kaplumbaga",
    title: "The turtle",
    titleTr: "Kaplumbağa",
    level: "A2",
    stage: 3,
    blurb: "An early walk on the beach, and nobody believes it.",
    lines: [
      ["Dün çok ilginç bir gün geçirdim.", "Yesterday I had a very interesting day."],
      ["Sabah erken kalktım ve sahile gittim.", "I got up early and went to the beach."],
      ["Sahilde bir kaplumbağa gördüm!", "I saw a turtle on the beach!"],
      ["Kaplumbağa yavaş yavaş denize yürüdü.", "The turtle walked slowly to the sea."],
      ["Fotoğrafını çekmek istedim ama telefonum yanımda değildi.", "I wanted to take its photo, but my phone wasn't with me."],
      ["Öğleden sonra arkadaşım Deniz'i aradım ve her şeyi anlattım.", "In the afternoon I called my friend Deniz and told her everything."],
      ["Deniz bana inanmadı!", "Deniz didn't believe me!"],
    ],
    questions: [
      { q: "What did the writer see?", options: ["A dolphin", "A turtle", "A cat"], answer: 1 },
      { q: "Why is there no photo?", options: ["The phone wasn't with them", "It was too dark", "The turtle was too fast"], answer: 0 },
    ],
  },
  {
    id: "yeni-ev",
    title: "The new house",
    titleTr: "Yeni ev",
    level: "A2",
    stage: 3,
    blurb: "Moving to Girne: three bedrooms, a balcony, and the rent.",
    lines: [
      ["Gelecek ay yeni bir eve taşınacağız.", "Next month we're moving to a new house."],
      ["Yeni ev Girne'de, denize çok yakın.", "The new house is in Girne, very close to the sea."],
      ["Üç yatak odası ve büyük bir balkonu var.", "It has three bedrooms and a big balcony."],
      ["Balkonda her akşam çay içeceğiz.", "We'll drink tea on the balcony every evening."],
      ["Ama kira biraz pahalı.", "But the rent is a bit expensive."],
      ["Bu yüzden daha az dışarıda yemek yiyeceğiz.", "So we'll eat out less."],
      ["Taşınmak yorucu ama çok heyecanlıyız!", "Moving is tiring, but we're very excited!"],
    ],
    questions: [
      { q: "When are they moving?", options: ["Next week", "Next month", "Next year"], answer: 1 },
      { q: "How many bedrooms does it have?", options: ["Two", "Three", "Four"], answer: 1 },
      { q: "What's the downside?", options: ["It's far from the sea", "The rent is a bit expensive", "It has no balcony"], answer: 1 },
    ],
  },
  {
    id: "doktorda",
    title: "At the doctor's",
    titleTr: "Doktorda",
    level: "A2",
    stage: 4,
    blurb: "Three days of headaches and some sensible advice.",
    lines: [
      ["Üç gündür başım ağrıyor.", "My head has been aching for three days."],
      ["Bugün doktora gittim.", "Today I went to the doctor."],
      ["Doktor \"Ateşiniz var mı?\" diye sordu.", "The doctor asked, \"Do you have a fever?\""],
      ["\"Hayır, ama çok yorgunum,\" dedim.", "\"No, but I'm very tired,\" I said."],
      ["Doktor \"Daha çok su içmelisiniz ve dinlenmelisiniz,\" dedi.", "The doctor said, \"You should drink more water and rest.\""],
      ["Eczaneden bir ağrı kesici aldım.", "I got a painkiller from the pharmacy."],
      ["Şimdi evdeyim ve dinleniyorum.", "Now I'm at home, resting."],
    ],
    questions: [
      { q: "How long has the headache lasted?", options: ["One day", "Three days", "A week"], answer: 1 },
      { q: "What did the doctor advise?", options: ["Drink more water and rest", "Go to work", "Take antibiotics"], answer: 0 },
    ],
  },
  {
    id: "kahvalti",
    title: "The Cypriot breakfast",
    titleTr: "Kıbrıs kahvaltısı",
    level: "A2",
    stage: 4,
    blurb: "Hellim, olives, endless tea, and what to say afterwards.",
    lines: [
      ["Kıbrıs'ta kahvaltı çok önemlidir.", "In Cyprus, breakfast is very important."],
      ["Hafta sonları aileler uzun kahvaltılar yapar.", "At weekends, families have long breakfasts."],
      ["Masada hellim, zeytin, domates, salatalık ve reçel olur.", "On the table there's halloumi, olives, tomatoes, cucumber and jam."],
      ["Hellimi genellikle ızgarada pişirirler.", "They usually grill the halloumi."],
      ["Herkes çay içer; çay hiç bitmez!", "Everyone drinks tea; the tea never runs out!"],
      ["Kahvaltı bazen iki saat sürer.", "Breakfast sometimes lasts two hours."],
      ["Yemekten sonra herkes \"Elinize sağlık!\" der.", "After the meal, everyone says \"Elinize sağlık!\" (bless your hands)."],
    ],
    questions: [
      { q: "How long can breakfast last?", options: ["Twenty minutes", "Two hours", "All day"], answer: 1 },
      { q: "How is the halloumi usually cooked?", options: ["Grilled", "Boiled", "It's eaten raw"], answer: 0 },
    ],
  },
  {
    id: "kayip-cuzdan",
    title: "The lost wallet",
    titleTr: "Kayıp cüzdan",
    level: "B1",
    stage: 5,
    blurb: "A wallet on the pavement, an address, and a new friend.",
    lines: [
      ["Geçen cuma Lefkoşa'da yürüyordum.", "Last Friday I was walking in Nicosia."],
      ["Yerde bir cüzdan gördüm.", "I saw a wallet on the ground."],
      ["İçinde para, kimlik ve bir aile fotoğrafı vardı.", "Inside there was money, an ID card and a family photo."],
      ["Kimlikteki adrese gitmeye karar verdim.", "I decided to go to the address on the ID card."],
      ["Kapıyı yaşlı bir adam açtı; cüzdanını görünce çok sevindi.", "An old man opened the door; when he saw his wallet he was delighted."],
      ["Meğer cüzdanı sabah otobüste düşürmüş.", "It turned out he had dropped it on the bus that morning."],
      ["Bana teşekkür etmek için ısrarla çay ikram etti.", "To thank me, he insisted on making me tea."],
      ["O gün yeni bir arkadaş edindim.", "That day I made a new friend."],
    ],
    questions: [
      { q: "What was in the wallet?", options: ["Only money", "Money, an ID card and a photo", "Keys"], answer: 1 },
      { q: "Where had the man dropped it?", options: ["On the bus", "At the market", "At home"], answer: 0 },
      { q: "How did he thank the writer?", options: ["He gave money", "He offered tea", "He wrote a letter"], answer: 1 },
    ],
  },
  {
    id: "bir-yil-sonra",
    title: "A year later",
    titleTr: "Bir yıl sonra",
    level: "B1",
    stage: 6,
    blurb: "From smiling and nodding to chatting with the neighbours.",
    lines: [
      ["Kıbrıs'a geldiğimde tek kelime Türkçe bilmiyordum.", "When I came to Cyprus, I didn't know a single word of Turkish."],
      ["Markette biri bana bir şey sorunca sadece gülümsüyordum.", "When someone asked me something in the shop, I just smiled."],
      ["Her gün biraz çalıştım: kelimeler, ekler, küçük diyaloglar.", "I studied a little every day: words, endings, little dialogues."],
      ["İlk aylarda çok hata yaptım ama insanlar hep sabırlıydı.", "In the first months I made lots of mistakes, but people were always patient."],
      ["Şimdi komşularımla sohbet edebiliyorum.", "Now I can chat with my neighbours."],
      ["Henüz mükemmel değilim, ama her gün daha iyi anlıyorum.", "I'm not perfect yet, but I understand better every day."],
      ["Eğer siz de başlamak istiyorsanız, bugün başlayın!", "If you want to start too, start today!"],
    ],
    questions: [
      { q: "What did the writer do when asked something at first?", options: ["Answered in English", "Just smiled", "Walked away"], answer: 1 },
      { q: "What can they do now?", options: ["Chat with their neighbours", "Teach Turkish", "Nothing yet"], answer: 0 },
    ],
  },
];

export const STORY_BY_ID = new Map(STORIES.map((s) => [s.id, s]));
