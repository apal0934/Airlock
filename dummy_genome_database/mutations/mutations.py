from graphene import ObjectType

from dummy_genome_database.mutations.genome import (
    AddVariants,
    CreateGenome,
    DeleteGenome,
)
from dummy_genome_database.mutations.variant import CreateVariant, DeleteVariant


class Mutations(ObjectType):
    create_genome = CreateGenome.Field()
    delete_genome = DeleteGenome.Field()
    add_variants = AddVariants.Field()

    create_variant = CreateVariant.Field()
    delete_variant = DeleteVariant.Field()
