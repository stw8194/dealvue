import { useEffect, useState } from "react";
import { requestPlaygroundCharacters } from "@/api/mypage";
import type { PlaygroundCharacter } from "@/type/mypage";

export default function Playground() {
  const [characters, setCharacters] = useState<PlaygroundCharacter[]>([]);

  useEffect(() => {
    requestPlaygroundCharacters().then(data => {
      if (data) setCharacters(data);
    });
  }, []);

  return (
    <section className="px-4 py-4">
      <p className="text-sm text-page-text">적립한 딜뷰 포인트로 캐릭터를 꾸미고, 헤메코 레벨을 올려보세요.</p>
      <ul className="mt-3 grid grid-cols-3 gap-3">
        {characters.map(character => (
          <li key={character.id} className="flex flex-col items-center gap-1">
            <img src={character.imageUrl} alt={character.name} className="h-20 w-20 object-contain" />
            <p className="text-xs text-page-text">Lv.{character.level}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
