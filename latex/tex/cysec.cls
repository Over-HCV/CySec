%% cysec.cls — clase para talleres de "Seguridad para Arquitectura Empresarial
%% y gestión de la seguridad" (Univ. del Rosario, código 32310005).
%%
%% Uso:
%%   \documentclass[es]{cysec}   % opciones: es (default) | en, final, answers
%%
%% La capa reutilizable vive en tex/; el Makefile apunta TEXINPUTS aquí, así
%% que \input{common/...} resuelve desde cualquier workshops/ws-XX/.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{cysec}[2026/08/14 v1.0 Talleres CySec — Arquitectura Empresarial y Seguridad]

\RequirePackage{iftex}
\RequireXeTeX

% ===== Opciones =====
\newcommand{\cyseclang}{es}
\newif\ifcysec@final \cysec@finalfalse
\newif\ifcysec@answers \cysec@answersfalse

\DeclareOption{es}{\renewcommand{\cyseclang}{es}}
\DeclareOption{en}{\renewcommand{\cyseclang}{en}}
\DeclareOption{final}{\cysec@finaltrue}
\DeclareOption{answers}{\cysec@answerstrue}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ExecuteOptions{es}
\ProcessOptions\relax

\LoadClass[11pt,a4paper]{article}

% ===== Preámbulo compartido =====
\input{common/preamble}
\input{common/course}
\input{common/macros}
\input{common/boxes}

% ===== Metadatos del taller =====
% Valores por defecto; cada workshops/ws-XX/meta.tex los sobreescribe.
\newcommand{\ws@number}{0}
\newcommand{\ws@title}{Sin título}
\newcommand{\ws@session}{0}
\newcommand{\ws@date}{\today}
\newcommand{\ws@author}{\course@author}

\newcommand{\wsnumber}[1]{\renewcommand{\ws@number}{#1}}
\newcommand{\wstitle}[1]{\renewcommand{\ws@title}{#1}}
\newcommand{\wssession}[1]{\renewcommand{\ws@session}{#1}}
\newcommand{\wsdate}[1]{\renewcommand{\ws@date}{#1}}
% Admite varias llamadas — un autor por línea en meta.tex: la primera
% sustituye al autor por defecto del curso y las demás se van añadiendo
% (se separan con «, » al renderizar). Antes cada llamada pisaba a la
% anterior y del equipo solo quedaba el último nombre.
% Se imprimen en \makewsheader, y solo ahí: el pie los llevaba y con tres
% nombres se solapaba con el número de página.
\newif\ifws@authorset \ws@authorsetfalse
\newcommand{\wsauthor}[1]{%
  \ifws@authorset
    \gappto{\ws@author}{, #1}%
  \else
    \ws@authorsettrue
    \renewcommand{\ws@author}{#1}%
  \fi
}

% Etiquetas dependientes del idioma
\newcommand{\cysec@lbl}[2]{\ifdefstring{\cyseclang}{es}{#1}{#2}}
\newcommand{\wslabel}{\cysec@lbl{Taller}{Workshop}}
\newcommand{\sessionlabel}{\cysec@lbl{Sesión}{Session}}

% ===== Caja de página =====
% Va ANTES de fancyhdr y no con el resto del layout, al final: fancyhdr fija su
% \headwidth con el \textwidth que encuentra al cargarse, y no vuelve a mirarlo.
% Cargado después, la cabecera y el pie se maquetaban con el \textwidth de
% `article` a4 (~390pt) mientras el cuerpo usaba los 16cm de geometry (455pt):
% la regla del pie se quedaba 65pt corta y los tres campos del pie se pisaban
% entre ellos por falta de sitio.
\RequirePackage[a4paper,margin=2.5cm,bottom=2.8cm]{geometry}

% ===== Cabecera y pies =====
\RequirePackage{fancyhdr}
\RequirePackage{lastpage}

\fancypagestyle{cysec}{%
  \fancyhf{}%
  \renewcommand{\headrulewidth}{0pt}%
  \renewcommand{\footrulewidth}{0.4pt}%
  % Sin autores: son tres nombres, y centrados entre el taller y el número de
  % página no caben en 455pt por mucho que se afinen los márgenes. Quedan en la
  % cabecera de la primera página, que sí los envuelve.
  \fancyfoot[L]{\footnotesize\color{gray!80!black}\wslabel~\ws@number}%
  \fancyfoot[R]{\footnotesize\color{gray!80!black}%
    \cysec@lbl{pág.}{p.}~\thepage\ \cysec@lbl{de}{of}~\pageref{LastPage}}%
}
\pagestyle{cysec}

% Cabecera compacta del documento (un taller son 3–5 páginas: no portada aparte).
\newcommand{\makewsheader}{%
  \thispagestyle{cysec}%
  \begingroup
  \setlength{\parindent}{0pt}%
  {\color{accent}\rule{\linewidth}{2pt}}\par\vspace{6pt}
  {\footnotesize\scshape\color{accent}\course\ \textbullet\ \coursecode}\par\vspace{2pt}
  {\LARGE\bfseries \wslabel~\ws@number{} — \ws@title}\par\vspace{4pt}
  {\footnotesize\color{gray!70!black}%
    \sessionlabel~\ws@session \quad\textbullet\quad \ws@date
    \quad\textbullet\quad \cysec@lbl{Profesor}{Instructor}: \professor}\par\vspace{2pt}
  {\footnotesize\bfseries \ws@author}\par\vspace{4pt}
  {\color{accent}\rule{\linewidth}{0.6pt}}\par
  \endgroup
  \vspace{12pt}
}

% ===== Layout (el resto; la caja de página se fija más arriba) =====
\setlength{\parskip}{0.5em}
\setlength{\parindent}{0pt}

\RequirePackage{titlesec}
\titleformat{\section}{\large\bfseries\color{accent}}{\thesection.}{0.6em}{}
\titleformat{\subsection}{\normalsize\bfseries}{\thesubsection}{0.6em}{}
\titlespacing*{\section}{0pt}{1.4em}{0.5em}

\endinput
