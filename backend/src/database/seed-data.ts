import { Role } from '@prisma/client';

export const SEED_USERS = [
  { email: 'admin@cmpc.cl', name: 'Administrador', password: 'Admin123!', role: Role.ADMIN },
  { email: 'usuario@cmpc.cl', name: 'Usuario Demo', password: 'Usuario123!', role: Role.USER },
];

export interface SeedBook {
  title: string;
  author: string;
  publisher: string;
  genre: string;
  price: number;
  stock: number;
}

export const SEED_BOOKS: SeedBook[] = [
  { title: 'Cien años de soledad', author: 'Gabriel García Márquez', publisher: 'Sudamericana', genre: 'Novela', price: 18990, stock: 12 },
  { title: 'El amor en los tiempos del cólera', author: 'Gabriel García Márquez', publisher: 'Sudamericana', genre: 'Novela', price: 16990, stock: 5 },
  { title: 'Crónica de una muerte anunciada', author: 'Gabriel García Márquez', publisher: 'Debolsillo', genre: 'Novela', price: 9990, stock: 0 },
  { title: 'La casa de los espíritus', author: 'Isabel Allende', publisher: 'Plaza & Janés', genre: 'Novela', price: 17990, stock: 8 },
  { title: 'Paula', author: 'Isabel Allende', publisher: 'Plaza & Janés', genre: 'Biografía', price: 14990, stock: 3 },
  { title: 'Eva Luna', author: 'Isabel Allende', publisher: 'Debolsillo', genre: 'Novela', price: 11990, stock: 0 },
  { title: 'Veinte poemas de amor y una canción desesperada', author: 'Pablo Neruda', publisher: 'Pehuén', genre: 'Poesía', price: 7990, stock: 20 },
  { title: 'Canto general', author: 'Pablo Neruda', publisher: 'Pehuén', genre: 'Poesía', price: 15990, stock: 4 },
  { title: 'Desolación', author: 'Gabriela Mistral', publisher: 'Editorial Universitaria', genre: 'Poesía', price: 8990, stock: 6 },
  { title: 'Ternura', author: 'Gabriela Mistral', publisher: 'Editorial Universitaria', genre: 'Poesía', price: 8490, stock: 0 },
  { title: '2666', author: 'Roberto Bolaño', publisher: 'Anagrama', genre: 'Novela', price: 24990, stock: 2 },
  { title: 'Los detectives salvajes', author: 'Roberto Bolaño', publisher: 'Anagrama', genre: 'Novela', price: 21990, stock: 7 },
  { title: 'Estrella distante', author: 'Roberto Bolaño', publisher: 'Anagrama', genre: 'Novela', price: 12990, stock: 1 },
  { title: 'Rayuela', author: 'Julio Cortázar', publisher: 'Alfaguara', genre: 'Novela', price: 16490, stock: 9 },
  { title: 'Bestiario', author: 'Julio Cortázar', publisher: 'Alfaguara', genre: 'Cuento', price: 10990, stock: 0 },
  { title: 'Ficciones', author: 'Jorge Luis Borges', publisher: 'Debolsillo', genre: 'Cuento', price: 11490, stock: 11 },
  { title: 'El Aleph', author: 'Jorge Luis Borges', publisher: 'Debolsillo', genre: 'Cuento', price: 11490, stock: 6 },
  { title: 'Pedro Páramo', author: 'Juan Rulfo', publisher: 'RM', genre: 'Novela', price: 9990, stock: 14 },
  { title: 'La ciudad y los perros', author: 'Mario Vargas Llosa', publisher: 'Alfaguara', genre: 'Novela', price: 17490, stock: 3 },
  { title: 'Conversación en La Catedral', author: 'Mario Vargas Llosa', publisher: 'Alfaguara', genre: 'Novela', price: 22990, stock: 0 },
  { title: 'El túnel', author: 'Ernesto Sabato', publisher: 'Seix Barral', genre: 'Novela', price: 9490, stock: 10 },
  { title: 'Sobre héroes y tumbas', author: 'Ernesto Sabato', publisher: 'Seix Barral', genre: 'Novela', price: 15990, stock: 2 },
  { title: 'Don Quijote de la Mancha', author: 'Miguel de Cervantes', publisher: 'Real Academia Española', genre: 'Clásico', price: 29990, stock: 5 },
  { title: '1984', author: 'George Orwell', publisher: 'Debolsillo', genre: 'Ciencia ficción', price: 12990, stock: 15 },
  { title: 'Rebelión en la granja', author: 'George Orwell', publisher: 'Debolsillo', genre: 'Clásico', price: 8990, stock: 0 },
  { title: 'Fahrenheit 451', author: 'Ray Bradbury', publisher: 'Minotauro', genre: 'Ciencia ficción', price: 13490, stock: 7 },
  { title: 'Crónicas marcianas', author: 'Ray Bradbury', publisher: 'Minotauro', genre: 'Ciencia ficción', price: 13990, stock: 4 },
  { title: 'Fundación', author: 'Isaac Asimov', publisher: 'Debolsillo', genre: 'Ciencia ficción', price: 14490, stock: 9 },
  { title: 'Yo, robot', author: 'Isaac Asimov', publisher: 'Debolsillo', genre: 'Ciencia ficción', price: 11990, stock: 0 },
  { title: 'El señor de los anillos: la comunidad del anillo', author: 'J. R. R. Tolkien', publisher: 'Minotauro', genre: 'Fantasía', price: 19990, stock: 13 },
  { title: 'El hobbit', author: 'J. R. R. Tolkien', publisher: 'Minotauro', genre: 'Fantasía', price: 14990, stock: 8 },
  { title: 'Harry Potter y la piedra filosofal', author: 'J. K. Rowling', publisher: 'Salamandra', genre: 'Fantasía', price: 15490, stock: 25 },
  { title: 'El nombre del viento', author: 'Patrick Rothfuss', publisher: 'Plaza & Janés', genre: 'Fantasía', price: 21490, stock: 6 },
  { title: 'Asesinato en el Orient Express', author: 'Agatha Christie', publisher: 'Planeta', genre: 'Policial', price: 10990, stock: 7 },
  { title: 'Diez negritos', author: 'Agatha Christie', publisher: 'Planeta', genre: 'Policial', price: 10990, stock: 0 },
  { title: 'El nombre de la rosa', author: 'Umberto Eco', publisher: 'Lumen', genre: 'Policial', price: 18490, stock: 3 },
  { title: 'Sapiens: de animales a dioses', author: 'Yuval Noah Harari', publisher: 'Debate', genre: 'Historia', price: 22490, stock: 10 },
  { title: 'Breve historia del tiempo', author: 'Stephen Hawking', publisher: 'Crítica', genre: 'Ciencia', price: 16990, stock: 5 },
  { title: 'El principito', author: 'Antoine de Saint-Exupéry', publisher: 'Salamandra', genre: 'Infantil', price: 7490, stock: 30 },
  { title: 'Papelucho', author: 'Marcela Paz', publisher: 'Editorial Universitaria', genre: 'Infantil', price: 8990, stock: 18 },
  { title: 'Hijo de ladrón', author: 'Manuel Rojas', publisher: 'Zig-Zag', genre: 'Novela', price: 9990, stock: 4 },
  { title: 'Martín Rivas', author: 'Alberto Blest Gana', publisher: 'Zig-Zag', genre: 'Clásico', price: 8490, stock: 12 },
];
