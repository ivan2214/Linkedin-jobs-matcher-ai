import { userProfile } from '../profile.js';

export function generateSearchQueriesJobsSearched(): string[] {
    const queries: string[] = [
        "Frontend Developer",
        "React Developer",
        "JavaScript Developer",
        "TypeScript Developer",
        "Full Stack Developer",
        "Back End Developer",
        "Node.js Developer",
        "Express Developer",
        "Laravel Developer",
        "PHP Developer",
        "Next.js Developer",
        "Fullstack Developer",
        "Full stack developer",
        "Desarrollador Frontend",
        "Desarrollador React",
        "Desarrollador JavaScript",
        // ... (resto de las queries del código anterior)
    ];

    return [...new Set(queries)];
}

export function generateSearchQueriesPublished(): string[] {
    return [
        '(Frontend OR "Front End") AND (Developer OR Engineer) AND ("1-2 years" OR "hasta 2 años")',
        'Developer AND (Frontend OR "Front End") AND ("1 year" OR "2 years") AND (Remote OR Argentina)',
        '(React OR JavaScript) AND Developer AND ("1-2 years" OR "2 years experience")',
        // ... (resto de las queries del código anterior)
    ];
}
