export type Project = {
  id: string;
  title: string;
  area: string;
  price: string;
  description: string;
  images: string[];
};

export const housesData: Project[] = [
  {
    id: 'house-1',
    title: 'Модульный дом "Сканди 45"',
    area: '45 м²',
    price: 'от 1 800 000 ₽',
    description: 'Уютный модульный дом в скандинавском стиле. Идеально подойдет для круглогодичного проживания небольшой семьи. Панорамные окна, просторная терраса и продуманная планировка.',
    images: [
      '/photos/hero-house.jpg?v=3',
      '/photos/gallery-01.jpg',
      '/photos/gallery-02.jpg'
    ]
  },
  {
    id: 'house-2',
    title: 'Модульный дом "Барнхаус 60"',
    area: '60 м²',
    price: 'от 2 400 000 ₽',
    description: 'Стильный барнхаус с высокими потолками. Просторная кухня-гостиная, две спальни и современный санузел. Отличный вариант для загородного отдыха.',
    images: [
      '/photos/gallery-03.jpg',
      '/photos/gallery-04.jpg',
      '/photos/gallery-05.jpg'
    ]
  }
];

export const bathsData: Project[] = [
  {
    id: 'bath-1',
    title: 'Модульная баня "Релакс 18"',
    area: '18 м²',
    price: 'от 650 000 ₽',
    description: 'Компактная баня с парилкой, моечной и уютной комнатой отдыха. Быстрый прогрев и долговечные материалы.',
    images: [
      '/photos/baths-dusk.jpg?v=2',
      '/photos/bath-terrace.jpg',
      '/photos/bath-small.jpg'
    ]
  },
  {
    id: 'bath-2',
    title: 'Баня-сауна с террасой "Комфорт 24"',
    area: '24 м²',
    price: 'от 890 000 ₽',
    description: 'Просторная модульная баня-сауна с открытой террасой для отдыха на свежем воздухе после парения.',
    images: [
      '/photos/barrel-snow.jpg',
      '/photos/gallery-08.jpg',
      '/photos/gallery-09.jpg'
    ]
  }
];

export const galleryCategories: Record<string, string[]> = {
  utility: [
    '/photos/gallery-05.jpg',
    '/photos/gallery-06.jpg',
    '/photos/gallery-07.jpg'
  ],
  gazebos: [
    '/photos/gallery-10.jpg',
    '/photos/gallery-11.jpg',
    '/photos/gallery-12.jpg'
  ],
  swings: [
    '/photos/gallery-01.jpg',
    '/photos/gallery-02.jpg'
  ],
  complexes: [
    '/photos/hero-house.jpg?v=3',
    '/photos/baths-dusk.jpg?v=2'
  ],
  foundations: [
    '/photos/gallery-08.jpg',
    '/photos/gallery-09.jpg'
  ]
};
