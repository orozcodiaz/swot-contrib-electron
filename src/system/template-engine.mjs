import * as fs from 'node:fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getUnmentionedSchoolTemplate(schoolName, domain, filePath) {
    let templateContent = GetOriginalTemplateContent('templates/unmentioned-school.html');
    let schoolNameReduced = ShortenString(schoolName);

    // Replace placeholders with actual values
    templateContent = templateContent
        .replace(/{{schoolNameReduced}}/g, schoolNameReduced)
        .replace(/{{schoolName}}/g, schoolName)
        .replace(/{{domain}}/g, domain)
        .replace(/{{filePath}}/g, filePath);

    return templateContent;
}

function ShortenString(str, maxLength = 45)
{
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

function GetOriginalTemplateContent(templatePath)
{
    return fs.readFileSync(path.join(__dirname, '..', 'views', templatePath), 'utf8');
}