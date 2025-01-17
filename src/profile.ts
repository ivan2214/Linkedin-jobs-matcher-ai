interface Experience {
	empresa: string;
	puesto: string;
	duracion: string;
	tecnologias: string[];
}

interface Education {
	titulo: string;
	institucion: string;
	graduacion: string;
}

interface UserProfile {
	nombre: string;
	titulo: string;
	experiencia: Experience[];
	educacion: Education;
	habilidades: string[];
}

export const userProfile: UserProfile = {
	nombre: "Iván Bongiovanni",
	titulo: "Desarrollador de Software",
	experiencia: [
		{
			empresa: "Tensolite SA",
			puesto: "Desarrollador Frontend",
			duracion: "4 meses",
			tecnologias: [
				"Desarrollo de aplicaciones web",
				"React-Redux",
				"TypeScript",
				"Redux-Toolkit",
				"JavaScript",
				"Desarrollo Full Stack",
				"React.js",
				"Codificación de front-end",
				"Mongoose",
				"React",
				"Node.js",
				"Express",
				"Laravel",
			],
		},
		{
			empresa: "Doctor Qali",
			puesto: "Desarrollador Frontend",
			duracion: "4 meses",
			tecnologias: [
				"Desarrollo de aplicaciones web",
				"Prime react",
				"React-Redux",
				"Git",
				"TailwindCSS",
				"Redux-Toolkit",
				"Desarrollo Full Stack",
				"Desarrollo web",
				"Codificación de front-end",
				"GitHub",
				"Trabajo en equipo",
				"React",
			],
		},
	],
	educacion: {
		titulo: "Programador Universitario",
		institucion:
			"FACET - Facultad de Ciencias Exactas y Tecnologías de la Universidad Nacional de Tucumán",
		graduacion: "En curso",
	},
	habilidades: [
		"JavaScript",
		"TypeScript",
		"React",
		"Redux",
		"Node.js",
		"Express",
		"MongoDB",
		"Git",
		"GitHub",
		"TailwindCSS",
		"Metodologías Ágiles",
		"Trabajo en equipo",
		"Comunicación",
		"Resolución de problemas",
		"Aprendizaje rápido",
		"Desarrollo web",
		"Desarrollo Frontend",
		"Desarrollo Full Stack",
		"Diseño responsivo",
		"Integración de APIs",
		"Optimización de rendimiento",
		"Control de versiones",
		"Documentación de código",
		"Depuración",
	],
};
