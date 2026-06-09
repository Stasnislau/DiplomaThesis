"""Synthetic PDF fixtures for material-flow integration tests.

We use reportlab to lay out plausibly TOEFL/Cambridge-shaped pages
with a real reading passage of the right length plus a list of
questions, so the classification step has something realistic to chew
on. The contents below are synthetic and don't reproduce any
copyrighted exam item.
"""

from __future__ import annotations

import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
)


# ~720 words — sized to TOEFL Reading. Topic: bird migration. Style
# is encyclopaedic / expository to mirror what a TOEFL passage feels
# like.
_PASSAGE_BIRD_MIGRATION = """
Migration is one of the most striking phenomena in the animal kingdom,
and birds are perhaps its most accomplished practitioners. Across the
planet, billions of individual birds undertake seasonal journeys each
year, flying from breeding grounds where they raise their young to
distant wintering areas where food remains plentiful. The arctic
tern, for example, is celebrated for travelling roughly forty thousand
kilometres annually between its arctic breeding sites and the rich
oceanic waters of the antarctic. Such voyages require not only
extraordinary endurance but also a sophisticated suite of navigational
abilities that biologists have only recently begun to understand in
detail.

The cues a migrating bird relies on are surprisingly varied. Even on
overcast days, when the sun is hidden behind thick cloud, many
species can still orient themselves by detecting subtle patterns of
polarised light. At night, others use the rotation of the stars as a
celestial compass; experiments conducted in planetariums have shown
that young birds raised under artificial skies fix on the apparent
centre of stellar rotation as a fixed reference point. A separate set
of studies suggests that some species perceive the earth's magnetic
field through specialised cells in the eye and possibly in the upper
beak, giving them an internal compass that operates regardless of
the weather.

Energy management is the other half of the migration puzzle. Long
before departure, migratory birds engage in a period of intense
feeding known as hyperphagia, during which they may double their
body mass with stored fat. This fuel is then burned during sustained
flight, and certain species have evolved the ability to shrink
non-essential organs, such as the intestines, in order to lighten
their load. When food along the route is unreliable, even small
miscalculations in fat reserves can mean the difference between a
successful crossing and starvation over open water.

Climate change is now disrupting these finely tuned systems. As
warming temperatures cause insects to emerge earlier in spring,
migratory birds that arrive on the basis of unchanged photoperiodic
cues may discover that the peak of food availability has already
passed by the time they reach their breeding grounds. Researchers
call this phenomenon ecological mismatch, and it has been linked to
declines in the breeding success of several long-distance migrants
in Europe and North America. Conservation biologists are particularly
concerned because, unlike resident birds, migrants depend on a chain
of habitats spanning multiple continents; the loss of any single
link can have outsized consequences.

Human-built obstacles add a further layer of risk. Tall buildings
illuminated at night confuse nocturnally migrating songbirds, drawing
them off course and into fatal collisions. Wind turbines and
transmission lines kill significant numbers of migrants each year,
and the conversion of stopover wetlands to agricultural land deprives
travel-weary flocks of the resting and refuelling sites they need.
Some progress has been made: cities such as Toronto and New York have
introduced dim-the-lights initiatives during peak migration windows,
and citizen-science programmes are now mapping collision hotspots so
that planners can target retrofits where they will save the most
lives.

In recent years, the data revolution has transformed migration
science itself. Tiny geolocators that weigh less than a paperclip,
attached to the bodies of even small songbirds, allow ornithologists
to track individual journeys with previously unimaginable precision.
Radar networks originally built for weather forecasting have been
repurposed to detect the dense clouds of birds passing through the
atmosphere on calm spring nights. Combined with crowdsourced bird-
sighting databases, these technologies are producing migration maps
of unprecedented detail. They reveal not only where birds go, but
also how flexible their routes can be in the face of unusual storms
or unseasonal warmth.

Despite all this progress, fundamental questions remain. Why do some
populations winter thousands of kilometres farther south than their
neighbours, even within the same species? How exactly do young birds,
on their very first migration with no experienced adult to follow,
manage to find a wintering site they have never seen? Each answer
seems to raise new questions, ensuring that bird migration will
remain one of the most intriguing puzzles in modern biology for
years to come.
"""

_QUESTIONS_BLOCK = """
Questions 1 to 7 refer to the passage above.

1. According to the passage, the arctic tern's annual journey covers
   approximately how many kilometres?
   (A) 4,000   (B) 14,000   (C) 40,000   (D) 400,000

2. What does the passage suggest about a bird's ability to navigate
   under cloudy skies?
   (A) It is essentially impossible.
   (B) It depends only on memorised landmarks.
   (C) It can rely on patterns of polarised light.
   (D) It is more accurate than star navigation.

3. The word "hyperphagia" in paragraph 3 most nearly means
   (A) reduced appetite       (B) intense feeding
   (C) elevated body temperature (D) hibernation

4. Which of the following is NOT mentioned in the passage as a
   navigational cue used by migrating birds?
   (A) Polarised light       (B) Star rotation
   (C) Earth's magnetic field (D) Echolocation

5. The author mentions ecological mismatch primarily in order to
   (A) introduce a new field of biology
   (B) describe how warming temperatures decouple birds from their
       food supply
   (C) explain why some birds choose to remain resident
   (D) compare resident and migratory species

6. According to paragraph 5, which initiatives have cities undertaken
   to reduce migrant mortality?
   (A) Banning tall buildings entirely.
   (B) Introducing programmes to dim lights during peak migration.
   (C) Replacing all transmission lines with underground cables.
   (D) Outlawing wind turbines along major flyways.

7. The final paragraph is best described as
   (A) a concluding summary of the passage's main argument.
   (B) a description of one specific case study.
   (C) a reflection on unanswered questions in migration science.
   (D) a critique of recent advances in bird tracking.
"""


def write_toefl_reading_pdf() -> bytes:
    """Build a TOEFL-style reading PDF in memory and return the bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, title="Synthetic TOEFL Reading")
    styles = getSampleStyleSheet()
    story = [
        Paragraph("READING PASSAGE — Bird Migration", styles["Title"]),
        Spacer(1, 12),
    ]
    for para in _PASSAGE_BIRD_MIGRATION.strip().split("\n\n"):
        story.append(Paragraph(para.replace("\n", " ").strip(), styles["BodyText"]))
        story.append(Spacer(1, 8))

    story.append(PageBreak())
    story.append(Paragraph("QUESTIONS", styles["Heading2"]))
    story.append(Spacer(1, 12))
    for line in _QUESTIONS_BLOCK.strip().split("\n"):
        story.append(Paragraph(line.strip() or "&nbsp;", styles["BodyText"]))

    doc.build(story)
    return buf.getvalue()
